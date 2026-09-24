-- Materias primas y recetas base para el catalogo Burger House.
-- Las cantidades son por porcion y fueron inferidas desde las descripciones
-- del catalogo; deben ajustarse si existe una ficha tecnica oficial.
-- Requiere haber ejecutado migrate_burgerhouse_products.sql previamente.

BEGIN;

-- Materias primas. Se reutilizan exclusivamente las categorias raw_material
-- existentes: Panaderia, Carnes, Verduras y hortalizas, Salsas y condimentos,
-- Lacteos y Aceites y grasas.
WITH raw_material_data (material_name, category_name, unit_abbreviation) AS (
  VALUES
    ('Pan de perro', 'Panadería', 'Un'),
    ('Pan de pepito', 'Panadería', 'Un'),
    ('Pan de hamburguesa', 'Panadería', 'Un'),
    ('Pan de papa', 'Panadería', 'Un'),
    ('Pan de sandwich', 'Panadería', 'Un'),
    ('Carne molida', 'Carnes', 'Gr'),
    ('Solomo', 'Carnes', 'Gr'),
    ('Pollo cocido', 'Carnes', 'Gr'),
    ('Pollo crispy', 'Carnes', 'Gr'),
    ('Tenders de pollo', 'Carnes', 'Gr'),
    ('Salchicha', 'Carnes', 'Un'),
    ('Chorizo', 'Carnes', 'Gr'),
    ('Jamon', 'Carnes', 'Gr'),
    ('Tocineta', 'Carnes', 'Gr'),
    ('Camarones', 'Carnes', 'Gr'),
    ('Papas fritas', 'Verduras y hortalizas', 'Gr'),
    ('Tomate', 'Verduras y hortalizas', 'Gr'),
    ('Lechuga', 'Verduras y hortalizas', 'Gr'),
    ('Cebolla', 'Verduras y hortalizas', 'Gr'),
    ('Cebolla morada', 'Verduras y hortalizas', 'Gr'),
    ('Cebolla crispy', 'Verduras y hortalizas', 'Gr'),
    ('Pepinillo', 'Verduras y hortalizas', 'Gr'),
    ('Repollo', 'Verduras y hortalizas', 'Gr'),
    ('Maiz', 'Verduras y hortalizas', 'Gr'),
    ('Queso amarillo', 'Lacteos', 'Gr'),
    ('Queso cheddar', 'Lacteos', 'Gr'),
    ('Queso mozzarella', 'Lacteos', 'Gr'),
    ('Queso parmesano', 'Lacteos', 'Gr'),
    ('Huevo', 'Lacteos', 'Un'),
    ('Mayonesa', 'Salsas y condimentos', 'Ml'),
    ('Ketchup', 'Salsas y condimentos', 'Ml'),
    ('Mostaza', 'Salsas y condimentos', 'Ml'),
    ('Salsa especial', 'Salsas y condimentos', 'Ml'),
    ('Salsa tasty', 'Salsas y condimentos', 'Ml'),
    ('Salsa Big Mac', 'Salsas y condimentos', 'Ml'),
    ('Mermelada de tocineta', 'Salsas y condimentos', 'Gr')
)
INSERT INTO public.raw_materials (
  name,
  category_id,
  unit_id,
  min_stock,
  average_cost
)
SELECT
  raw_material_data.material_name,
  categories.id,
  units.id,
  0,
  0
FROM raw_material_data
JOIN public.categories
  ON categories.applies_to = 'raw_material'
 AND categories.name = raw_material_data.category_name
JOIN public.units
  ON units.abbreviation = raw_material_data.unit_abbreviation
WHERE NOT EXISTS (
  SELECT 1
  FROM public.raw_materials existing
  WHERE existing.name = raw_material_data.material_name
    AND existing.deleted_at IS NULL
);

-- Recetas base. quantity usa la unidad indicada en unit_abbreviation.
WITH recipe_data (product_name, material_name, quantity, unit_abbreviation) AS (
  VALUES
    -- Producto existente en el respaldo.
    ('Hamburguesa clasic', 'Pan de hamburguesa', 1, 'Un'),
    ('Hamburguesa clasic', 'Carne molida', 120, 'Gr'),
    ('Hamburguesa clasic', 'Tomate', 25, 'Gr'),
    ('Hamburguesa clasic', 'Lechuga', 15, 'Gr'),
    ('Hamburguesa clasic', 'Cebolla', 15, 'Gr'),
    ('Hamburguesa clasic', 'Mayonesa', 10, 'Ml'),
    ('Hamburguesa clasic', 'Ketchup', 10, 'Ml'),
    ('CLÁSICA', 'Pan de hamburguesa', 1, 'Un'),
    ('CLÁSICA', 'Carne molida', 120, 'Gr'),
    ('CLÁSICA', 'Tomate', 25, 'Gr'),
    ('CLÁSICA', 'Lechuga', 15, 'Gr'),
    ('CLÁSICA', 'Cebolla', 15, 'Gr'),
    ('CLÁSICA', 'Mayonesa', 10, 'Ml'),
    ('CLÁSICA', 'Ketchup', 10, 'Ml'),

    ('PEPITO TRADICIONAL', 'Pan de pepito', 1, 'Un'),
    ('PEPITO TRADICIONAL', 'Solomo', 100, 'Gr'),
    ('PEPITO TRADICIONAL', 'Tomate', 25, 'Gr'),
    ('PEPITO TRADICIONAL', 'Lechuga', 15, 'Gr'),
    ('PEPITO TRADICIONAL', 'Cebolla', 15, 'Gr'),
    ('PEPITO TRADICIONAL', 'Mayonesa', 15, 'Ml'),
    ('PEPITO TRADICIONAL', 'Ketchup', 10, 'Ml'),
    ('PEPITO TRADICIONAL', 'Papas fritas', 100, 'Gr'),
    ('PEPITO MIXTO', 'Pan de pepito', 1, 'Un'),
    ('PEPITO MIXTO', 'Solomo', 50, 'Gr'),
    ('PEPITO MIXTO', 'Pollo cocido', 50, 'Gr'),
    ('PEPITO MIXTO', 'Chorizo', 30, 'Gr'),
    ('PEPITO MIXTO', 'Tocineta', 20, 'Gr'),
    ('PEPITO MIXTO', 'Queso amarillo', 20, 'Gr'),
    ('PEPITO MIXTO', 'Queso parmesano', 10, 'Gr'),
    ('PEPITO MIXTO', 'Queso cheddar', 20, 'Gr'),
    ('PEPITO MIXTO', 'Maiz', 20, 'Gr'),
    ('PEPITO MIXTO', 'Papas fritas', 100, 'Gr'),
    ('PEPITO GRATINADO', 'Pan de pepito', 1, 'Un'),
    ('PEPITO GRATINADO', 'Solomo', 100, 'Gr'),
    ('PEPITO GRATINADO', 'Tocineta', 20, 'Gr'),
    ('PEPITO GRATINADO', 'Queso mozzarella', 30, 'Gr'),
    ('PEPITO GRATINADO', 'Queso cheddar', 20, 'Gr'),
    ('PEPITO GRATINADO', 'Papas fritas', 100, 'Gr'),
    ('PEPITO ESPECIAL', 'Pan de pepito', 1, 'Un'),
    ('PEPITO ESPECIAL', 'Pollo cocido', 70, 'Gr'),
    ('PEPITO ESPECIAL', 'Camarones', 50, 'Gr'),
    ('PEPITO ESPECIAL', 'Queso mozzarella', 30, 'Gr'),
    ('PEPITO ESPECIAL', 'Queso parmesano', 10, 'Gr'),
    ('PEPITO ESPECIAL', 'Papas fritas', 100, 'Gr'),

    ('PERRO TRADICIONAL', 'Pan de perro', 1, 'Un'),
    ('PERRO TRADICIONAL', 'Salchicha', 1, 'Un'),
    ('PERRO TRADICIONAL', 'Repollo', 30, 'Gr'),
    ('PERRO TRADICIONAL', 'Cebolla', 15, 'Gr'),
    ('PERRO TRADICIONAL', 'Mayonesa', 10, 'Ml'),
    ('PERRO TRADICIONAL', 'Ketchup', 10, 'Ml'),
    ('PERRO TRADICIONAL', 'Mostaza', 5, 'Ml'),
    ('PERRO ESPECIAL', 'Pan de perro', 1, 'Un'),
    ('PERRO ESPECIAL', 'Salchicha', 1, 'Un'),
    ('PERRO ESPECIAL', 'Tocineta', 20, 'Gr'),
    ('PERRO ESPECIAL', 'Queso amarillo', 20, 'Gr'),
    ('PERRO ESPECIAL', 'Maiz', 15, 'Gr'),
    ('PERRO CON CARNE', 'Pan de perro', 1, 'Un'),
    ('PERRO CON CARNE', 'Salchicha', 1, 'Un'),
    ('PERRO CON CARNE', 'Carne molida', 60, 'Gr'),
    ('PERRO CON CARNE', 'Queso amarillo', 20, 'Gr'),

    ('PAPAS CON CARNE', 'Papas fritas', 300, 'Gr'),
    ('PAPAS CON CARNE', 'Carne molida', 200, 'Gr'),
    ('PAPAS CON CARNE', 'Queso amarillo', 30, 'Gr'),
    ('PAPAS CON CARNE', 'Tocineta', 20, 'Gr'),
    ('PAPAS CON CARNE', 'Mayonesa', 15, 'Ml'),
    ('PAPAS CON CARNE', 'Ketchup', 15, 'Ml'),
    ('SALCHIPAPAS', 'Papas fritas', 300, 'Gr'),
    ('SALCHIPAPAS', 'Salchicha', 2, 'Un'),
    ('SALCHIPAPAS', 'Queso cheddar', 30, 'Gr'),
    ('SALCHIPAPAS', 'Tocineta', 20, 'Gr'),
    ('PAPAS CHEDDAR', 'Papas fritas', 300, 'Gr'),
    ('PAPAS CHEDDAR', 'Queso cheddar', 40, 'Gr'),
    ('PAPAS CHEDDAR', 'Tocineta', 20, 'Gr'),

    ('CLUB HOUSE', 'Pan de sandwich', 3, 'Un'),
    ('CLUB HOUSE', 'Pollo cocido', 80, 'Gr'),
    ('CLUB HOUSE', 'Jamon', 30, 'Gr'),
    ('CLUB HOUSE', 'Queso amarillo', 30, 'Gr'),
    ('CLUB HOUSE', 'Tocineta', 20, 'Gr'),
    ('CLUB HOUSE', 'Huevo', 1, 'Un'),
    ('CLUB HOUSE', 'Tomate', 25, 'Gr'),
    ('CLUB HOUSE', 'Lechuga', 15, 'Gr'),
    ('CLUB HOUSE', 'Papas fritas', 100, 'Gr'),

    ('GRIEGO TRADICIONAL', 'Pan de pepito', 1, 'Un'),
    ('GRIEGO TRADICIONAL', 'Carne molida', 50, 'Gr'),
    ('GRIEGO TRADICIONAL', 'Pollo cocido', 50, 'Gr'),
    ('GRIEGO TRADICIONAL', 'Salchicha', 1, 'Un'),
    ('GRIEGO TRADICIONAL', 'Tocineta', 20, 'Gr'),
    ('GRIEGO TRADICIONAL', 'Jamon', 20, 'Gr'),
    ('GRIEGO TRADICIONAL', 'Queso amarillo', 20, 'Gr'),
    ('GRIEGO TRADICIONAL', 'Queso parmesano', 10, 'Gr'),
    ('GRIEGO TRADICIONAL', 'Papas fritas', 100, 'Gr'),
    ('GRIEGO ESPECIAL', 'Pan de pepito', 1, 'Un'),
    ('GRIEGO ESPECIAL', 'Carne molida', 50, 'Gr'),
    ('GRIEGO ESPECIAL', 'Pollo cocido', 50, 'Gr'),
    ('GRIEGO ESPECIAL', 'Camarones', 50, 'Gr'),
    ('GRIEGO ESPECIAL', 'Queso parmesano', 10, 'Gr'),
    ('GRIEGO ESPECIAL', 'Papas fritas', 100, 'Gr'),

    ('MINI BURGER', 'Pan de hamburguesa', 1, 'Un'),
    ('MINI BURGER', 'Carne molida', 60, 'Gr'),
    ('MINI BURGER', 'Queso cheddar', 15, 'Gr'),
    ('MINI BURGER', 'Papas fritas', 60, 'Gr'),
    ('TENDERS DE POLLO', 'Tenders de pollo', 150, 'Gr'),
    ('TENDERS DE POLLO', 'Mayonesa', 15, 'Ml'),
    ('TENDERS DE POLLO', 'Ketchup', 15, 'Ml'),

    ('CHEESE BURGER', 'Pan de hamburguesa', 1, 'Un'),
    ('CHEESE BURGER', 'Carne molida', 120, 'Gr'),
    ('CHEESE BURGER', 'Queso cheddar', 25, 'Gr'),
    ('CHEESE BURGER', 'Tomate', 25, 'Gr'),
    ('CHEESE BURGER', 'Lechuga', 15, 'Gr'),
    ('CHEESE BURGER', 'Cebolla', 15, 'Gr'),
    ('CHEESE BURGER', 'Tocineta', 20, 'Gr'),
    ('CHICKEN BURGER', 'Pan de hamburguesa', 1, 'Un'),
    ('CHICKEN BURGER', 'Pollo crispy', 120, 'Gr'),
    ('CHICKEN BURGER', 'Queso cheddar', 40, 'Gr'),
    ('CHICKEN BURGER', 'Tocineta', 30, 'Gr'),
    ('CRISPY BURGER', 'Pan de hamburguesa', 1, 'Un'),
    ('CRISPY BURGER', 'Pollo crispy', 120, 'Gr'),
    ('CRISPY BURGER', 'Queso cheddar', 20, 'Gr'),
    ('CRISPY BURGER', 'Lechuga', 15, 'Gr'),
    ('CRISPY BURGER', 'Tocineta', 20, 'Gr'),

    ('TENTACIÓN BURGER', 'Pan de hamburguesa', 1, 'Un'),
    ('TENTACIÓN BURGER', 'Carne molida', 100, 'Gr'),
    ('TENTACIÓN BURGER', 'Pollo cocido', 60, 'Gr'),
    ('TENTACIÓN BURGER', 'Queso cheddar', 25, 'Gr'),
    ('TENTACIÓN BURGER', 'Tocineta', 20, 'Gr'),
    ('TENTACIÓN BURGER', 'Tomate', 20, 'Gr'),
    ('TENTACIÓN BURGER', 'Lechuga', 15, 'Gr'),
    ('TENTACIÓN BURGER', 'Cebolla', 15, 'Gr'),
    ('TENTACIÓN BURGER', 'Maiz', 15, 'Gr'),
    ('BACON JAM BURGER', 'Pan de papa', 1, 'Un'),
    ('BACON JAM BURGER', 'Carne molida', 240, 'Gr'),
    ('BACON JAM BURGER', 'Queso cheddar', 40, 'Gr'),
    ('BACON JAM BURGER', 'Tocineta', 30, 'Gr'),
    ('BACON JAM BURGER', 'Mermelada de tocineta', 25, 'Gr'),
    ('ONION BURGER', 'Pan de hamburguesa', 1, 'Un'),
    ('ONION BURGER', 'Carne molida', 120, 'Gr'),
    ('ONION BURGER', 'Queso cheddar', 25, 'Gr'),
    ('ONION BURGER', 'Tocineta', 20, 'Gr'),
    ('ONION BURGER', 'Cebolla', 30, 'Gr'),
    ('ONION BURGER', 'Cebolla crispy', 20, 'Gr'),
    ('BURGER HOUSE', 'Pan de hamburguesa', 1, 'Un'),
    ('BURGER HOUSE', 'Carne molida', 100, 'Gr'),
    ('BURGER HOUSE', 'Pollo crispy', 60, 'Gr'),
    ('BURGER HOUSE', 'Queso cheddar', 25, 'Gr'),
    ('BURGER HOUSE', 'Tocineta', 20, 'Gr'),
    ('BURGER HOUSE', 'Maiz', 15, 'Gr'),
    ('BURGER HOUSE', 'Cebolla crispy', 20, 'Gr'),
    ('BIG BURGER', 'Pan de hamburguesa', 1, 'Un'),
    ('BIG BURGER', 'Carne molida', 240, 'Gr'),
    ('BIG BURGER', 'Queso cheddar', 40, 'Gr'),
    ('BIG BURGER', 'Tocineta', 20, 'Gr'),
    ('BIG BURGER', 'Pepinillo', 15, 'Gr'),
    ('BIG BURGER', 'Lechuga', 15, 'Gr'),
    ('BIG BURGER', 'Salsa Big Mac', 20, 'Ml'),
    ('TASTY BURGER', 'Pan de papa', 1, 'Un'),
    ('TASTY BURGER', 'Carne molida', 360, 'Gr'),
    ('TASTY BURGER', 'Queso cheddar', 60, 'Gr'),
    ('TASTY BURGER', 'Tocineta', 30, 'Gr'),
    ('TASTY BURGER', 'Tomate', 20, 'Gr'),
    ('TASTY BURGER', 'Cebolla', 15, 'Gr'),
    ('TASTY BURGER', 'Lechuga', 15, 'Gr'),
    ('SMASH BURGER', 'Pan de papa', 1, 'Un'),
    ('SMASH BURGER', 'Carne molida', 360, 'Gr'),
    ('SMASH BURGER', 'Queso cheddar', 60, 'Gr'),
    ('SMASH BURGER', 'Tocineta', 30, 'Gr'),
    ('SMASH BURGER', 'Cebolla morada', 20, 'Gr'),
    ('SMASH BURGER', 'Pepinillo', 15, 'Gr')
)
INSERT INTO public.recipe_items (product_id, raw_material_id, quantity, unit_id)
SELECT
  products.id,
  raw_materials.id,
  recipe_data.quantity,
  units.id
FROM recipe_data
JOIN public.products
  ON COALESCE(products.name->>'es', products.name #>> '{}') = recipe_data.product_name
 AND products.product_type = 'prepared'
 AND products.deleted_at IS NULL
JOIN public.raw_materials
  ON raw_materials.name = recipe_data.material_name
 AND raw_materials.deleted_at IS NULL
JOIN public.units
  ON units.abbreviation = recipe_data.unit_abbreviation
ON CONFLICT (product_id, raw_material_id) DO NOTHING;

COMMIT;
