-- Migracion de productos desde burger_house.sql a Supabase/PostgreSQL.
-- Fuente: tabla productos del dump MySQL.
-- Los precios del dump se interpretan como USD.
-- La tasa VES/USD debe ajustarse antes de ejecutar si corresponde otra tasa.
-- Los UUID, created_at y updated_at se generan con los valores DEFAULT de la nueva DB.

BEGIN;

-- Categorias usadas por el dump. Solo se insertan las que aun no existen.
INSERT INTO public.categories (applies_to, name, description)
SELECT 'product', legacy_name, 'Categoria migrada desde burger_house.sql'
FROM (VALUES
  ('Bebidas'),
  ('Pepitos'),
  ('Griegos'),
  ('Perros Calientes'),
  ('Papas'),
  ('Club House'),
  ('Hamburguesas'),
  ('Kids')
) AS legacy_categories(legacy_name)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.categories existing
  WHERE existing.applies_to = 'product'
    AND existing.name = legacy_categories.legacy_name
);

-- Todos los registros de productos del dump son productos preparados.
WITH legacy_products (legacy_category_id, product_name, product_description, price_usd, is_active) AS (
  VALUES
    (2, 'PEPITO TRADICIONAL', '22CM de pan, salsas, tomate, lechuga, cebolla, solomo o pollo, tocineta, queso parmesano y ración de papas fritas.', 7.00, true),
    (2, 'PEPITO MIXTO', '22CM de pan, salsas, tomate, lechuga, cebolla, solomo, pollo, chorizo, tocineta, queso amarillo, queso parmesano, queso cheddar, maíz y ración de papas fritas.', 11.00, true),
    (2, 'PEPITO GRATINADO', '22CM de pan, salsas, solomo, pollo o chorizo, tocineta, queso mozzarella, queso cheddar y ración de papas fritas.', 9.00, true),
    (2, 'PEPITO ESPECIAL', '22CM de pan, mayonesa, pollo y camarones, queso mozzarella gratinado, queso parmesano y ración de papas fritas.', 10.00, true),
    (4, 'PERRO TRADICIONAL', 'Pan grande, salchicha, salsas, repollo, cebolla y ración de papas fritas.', 2.00, true),
    (4, 'PERRO ESPECIAL', 'Pan grande, salchicha, salsas, tocineta, queso amarillo, maíz y ración de papas fritas.', 3.50, true),
    (4, 'PERRO CON CARNE', 'Pan grande, salchicha, salsas, carne, queso amarillo y ración de papas fritas.', 4.50, true),
    (6, 'CLUB HOUSE', 'Pan de sándwich, salsas, vegetales, pollo, jamón, queso, tocineta, tortilla de huevo y ración de papas fritas.', 8.00, true),
    (3, 'GRIEGO TRADICIONAL', 'Pan, salsas, vegetales, salchicha, carne, pollo o mixto, queso parmesano, tocineta, jamón, queso amarillo y ración de papas fritas.', 7.70, true),
    (3, 'GRIEGO ESPECIAL', 'Pan, salsas, vegetales, carne, pollo y camarones, queso parmesano y ración de papas fritas.', 9.00, true),
    (5, 'PAPAS CON CARNE', '300gr de papas, 200gr de carne o mixta, queso amarillo, tocineta, salsas.', 7.50, true),
    (5, 'SALCHIPAPAS', '300gr de papa, salchicha, cubiertas con queso cheddar con topping de tocineta.', 3.50, true),
    (5, 'PAPAS CHEDDAR', '300gr de papas fritas, cubiertas de queso cheddar y tocineta.', 2.80, true),
    (8, 'MINI BURGER', 'Pan de la casa, salsas, carne, queso cheddar y ración de papas fritas.', 3.00, true),
    (8, 'TENDERS DE POLLO', 'Tenders de pollo, salsas y ración de papas fritas.', 4.00, true),
    (7, 'CLÁSICA', 'Pan de la casa, carne, tomate, lechuga, cebolla, salsas, ración de papas fritas.', 2.80, true),
    (7, 'CHEESE BURGER', 'Pan de la casa, carne o pollo, tomate, lechuga, cebolla, salsas, queso cheddar, tocineta y ración de papas fritas.', 4.10, true),
    (7, 'CHICKEN BURGER', 'Pan de la casa, pollo crispy, salsa especial, doble cheddar, doble tocineta, ración de papas fritas.', 5.60, true),
    (7, 'CRISPY BURGER', 'Pan de la casa, salsa especial, pollo crispy, queso cheddar, lechuga, tocineta, ración de papas fritas.', 4.00, true),
    (7, 'TENTACIÓN BURGER', 'Pan de la casa, carne, pollo, tomate, lechuga, cebolla, salsas, queso cheddar, tocineta, maíz y ración de papas fritas.', 7.00, true),
    (7, 'BACON JAM BURGER', 'Pan de papa, mayonesa, doble carne, doble cheddar, mermelada de tocineta, ración de papas fritas.', 5.00, true),
    (7, 'ONION BURGER', 'Pan de la casa, carne o pollo, salsa especial, cebolla caramelizada o cebolla crispy, queso cheddar, tocineta y ración de papas fritas.', 4.00, true),
    (7, 'BURGER HOUSE', 'Pan de la casa, salsa especial, carne, pollo crispy, cebolla crispy, cebolla caramelizada, tocineta, queso cheddar, maíz y ración de papas fritas.', 6.50, true),
    (7, 'BIG BURGER', 'Pan de la casa, doble carne, doble queso cheddar, salsa Big Mac, pepinillo, lechuga, tocineta y ración de papas fritas.', 6.50, true),
    (7, 'TASTY BURGER', 'Pan de papa, salsa tasty, triple carne, triple cheddar, tocineta, tomate, cebolla, lechuga, ración de papas fritas.', 8.00, true),
    (7, 'SMASH BURGER', 'Pan de papa, salsa especial, triple carne, triple cheddar, tocineta, cebolla morada, pepinillo, ración de papas fritas.', 8.80, true),
    (1, 'Luis', 'awdk;oakd;kaw;odk;ad', 6.56, false),
    (1, 'Azucar', 'alwjdildjiladjiljdildwada', 656.56, false),
    (2, 'Shawarma', 'mailmdilwmlidmlwiadl', 50.00, false),
    (7, 'Combo Prueba', 'texto descriptivo', 2.50, true)
)
INSERT INTO public.products (
  product_type,
  category_id,
  name,
  description,
  price_ves,
  price_usd,
  image_url,
  is_active,
  is_sold_out,
  min_stock
)
SELECT
  'prepared',
  categories.id,
  jsonb_build_object('es', legacy_products.product_name, 'en', legacy_products.product_name),
  jsonb_build_object('es', legacy_products.product_description, 'en', legacy_products.product_description),
  round((legacy_products.price_usd * 804.8109)::numeric, 2),
  legacy_products.price_usd,
  NULL,
  legacy_products.is_active,
  false,
  0
FROM legacy_products
JOIN (VALUES
  (1, 'Bebidas'),
  (2, 'Pepitos'),
  (3, 'Griegos'),
  (4, 'Perros Calientes'),
  (5, 'Papas'),
  (6, 'Club House'),
  (7, 'Hamburguesas'),
  (8, 'Kids')
) AS category_map(legacy_category_id, category_name)
  ON category_map.legacy_category_id = legacy_products.legacy_category_id
JOIN public.categories
  ON categories.applies_to = 'product'
 AND categories.name = category_map.category_name;

COMMIT;
