-- ============================================================================
-- FASE 2: CONVERSIÓN DE UNIDADES - Migración completa
-- Permitir comprar en kg y usar en gr, con conversión automática
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Agregar columnas unit_id a tablas existentes
-- ----------------------------------------------------------------------------

-- recipe_items: unidad de la receta (ej: gr)
ALTER TABLE recipe_items 
  ADD COLUMN unit_id uuid REFERENCES units(id);

-- product_extras: unidad del extra (ej: gr) - independiente de la receta
ALTER TABLE product_extras 
  ADD COLUMN unit_id uuid REFERENCES units(id);

-- inventory_movements: unidad original del movimiento (para trazabilidad)
ALTER TABLE inventory_movements 
  ADD COLUMN unit_id uuid REFERENCES units(id);

-- Para raw_material: unit_id es obligatorio
ALTER TABLE inventory_movements 
  ADD CONSTRAINT chk_mov_raw_unit CHECK (
    item_type <> 'raw_material' OR unit_id IS NOT NULL
  );

-- ----------------------------------------------------------------------------
-- 2. Poblar unit_id en datos existentes (migración de datos)
-- ----------------------------------------------------------------------------

-- recipe_items: usar la unidad del raw_material
UPDATE recipe_items ri
SET unit_id = rm.unit_id
FROM raw_materials rm
WHERE ri.raw_material_id = rm.id
  AND ri.unit_id IS NULL;

-- product_extras: usar la unidad del raw_material vinculado
UPDATE product_extras pe
SET unit_id = rm.unit_id
FROM raw_materials rm
WHERE pe.raw_material_id = rm.id
  AND pe.unit_id IS NULL;

-- inventory_movements: usar la unidad del raw_material
UPDATE inventory_movements im
SET unit_id = rm.unit_id
FROM raw_materials rm
WHERE im.raw_material_id = rm.id
  AND im.unit_id IS NULL;

-- Hacer NOT NULL después de poblar
ALTER TABLE recipe_items ALTER COLUMN unit_id SET NOT NULL;
ALTER TABLE product_extras ALTER COLUMN unit_id SET NOT NULL;

-- Para raw_material: unit_id es obligatorio
ALTER TABLE inventory_movements 
  ADD CONSTRAINT chk_mov_raw_unit CHECK (
    item_type <> 'raw_material' OR unit_id IS NOT NULL
  );

-- ----------------------------------------------------------------------------
-- 3. Índices
-- ----------------------------------------------------------------------------

CREATE INDEX idx_recipe_items_unit ON recipe_items(unit_id);
CREATE INDEX idx_product_extras_unit ON product_extras(unit_id);
CREATE INDEX idx_inv_mov_unit ON inventory_movements(unit_id);

-- ----------------------------------------------------------------------------
-- 4. Actualizar vista current_stock (mostrar unidad + stock en unidad base)
-- ----------------------------------------------------------------------------

DROP VIEW IF EXISTS current_stock;

CREATE VIEW current_stock AS
SELECT
  'raw_material'::inventory_item_type AS item_type,
  raw_material_id AS item_id,
  rm.unit_id,
  u.abbreviation AS unit_abbreviation,
  COALESCE(SUM(
    CASE
      WHEN im.movement_type IN ('purchase_in','adjustment_in','transfer_in') THEN 
        im.quantity * COALESCE(um.conversion_factor,1) / rm_u.conversion_factor
      WHEN im.movement_type IN ('sale_out','adjustment_out','waste','transfer_out') THEN 
        -im.quantity * COALESCE(um.conversion_factor,1) / rm_u.conversion_factor
      ELSE 0
    END
  ), 0) AS stock
FROM inventory_movements im
JOIN raw_materials rm ON im.raw_material_id = rm.id
JOIN units rm_u ON rm.unit_id = rm_u.id
LEFT JOIN units um ON im.unit_id = um.id
LEFT JOIN units u ON rm.unit_id = u.id
WHERE im.raw_material_id IS NOT NULL
GROUP BY raw_material_id, rm.unit_id, u.abbreviation, rm_u.conversion_factor
UNION ALL
SELECT
  'product'::inventory_item_type AS item_type,
  product_id AS item_id,
  NULL::uuid AS unit_id,
  NULL::text AS unit_abbreviation,
  COALESCE(SUM(
    CASE
      WHEN im.movement_type IN ('purchase_in','adjustment_in','transfer_in') THEN im.quantity
      WHEN im.movement_type IN ('sale_out','adjustment_out','waste','transfer_out') THEN -im.quantity
      ELSE 0
    END
  ), 0) AS stock
FROM inventory_movements im
WHERE im.product_id IS NOT NULL
GROUP BY product_id;

-- ----------------------------------------------------------------------------
-- 5. Funciones helper para conversión en SQL
-- ----------------------------------------------------------------------------

-- Función helper para conversión en SQL
CREATE OR REPLACE FUNCTION convert_units(qty numeric, from_unit_id uuid, to_unit_id uuid)
RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT 
    CASE 
      WHEN from_unit_id = to_unit_id THEN qty
      ELSE qty * COALESCE(
        (SELECT conversion_factor FROM units WHERE id = from_unit_id), 1
      ) / COALESCE(
        (SELECT conversion_factor FROM units WHERE id = to_unit_id), 1
      )
    END;
$$;

-- Función para validar compatibilidad de unidades
CREATE OR REPLACE FUNCTION units_are_compatible(unit1_id uuid, unit2_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT 
    CASE 
      WHEN unit1_id = unit2_id THEN true
      ELSE (
        SELECT u1.unit_type = u2.unit_type
        FROM units u1, units u2
        WHERE u1.id = unit1_id AND u2.id = unit2_id
      )
    END;
$$;

-- ----------------------------------------------------------------------------
-- 6. Actualizar confirm_order_with_inventory (versión con conversión)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION confirm_order_with_inventory(p_order_id uuid, p_user_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_extra RECORD;
  v_recipe RECORD;
  v_movement_qty numeric;
  v_current_stock numeric;
  v_allow_negative boolean := true; -- TODO(fase-config): leer de tabla settings
BEGIN
  -- Bloquear fila orden para evitar race conditions
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  
  IF v_order.status <> 'pending' THEN
    RAISE EXCEPTION 'Solo se pueden confirmar órdenes en estado pending';
  END IF;
  
  -- Procesar cada order_item
  FOR v_item IN 
    SELECT oi.*, p.product_type 
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = p_order_id
  LOOP
    IF v_item.product_type = 'prepared' THEN
      -- Ítems de receta (materias primas) CON CONVERSIÓN DE UNIDADES
      FOR v_recipe IN
        SELECT ri.*, 
               ri.unit_id as recipe_unit_id,
               rm.unit_id as material_unit_id,
               u1.conversion_factor as recipe_factor,
               u2.conversion_factor as material_factor
        FROM recipe_items ri
        JOIN raw_materials rm ON ri.raw_material_id = rm.id
        JOIN units u1 ON ri.unit_id = u1.id
        JOIN units u2 ON rm.unit_id = u2.id
        WHERE ri.product_id = v_item.product_id
      LOOP
        -- Conversión: cantidad_receta * (factor_receta / factor_material)
        v_movement_qty := v_recipe.quantity * v_item.quantity * COALESCE(v_recipe.recipe_factor,1) / COALESCE(v_recipe.material_factor,1);
        
        INSERT INTO inventory_movements (item_type, raw_material_id, movement_type, quantity, unit_id, order_id, performed_by)
        VALUES ('raw_material', v_recipe.raw_material_id, 'sale_out', v_movement_qty, v_recipe.material_unit_id, p_order_id, p_user_id);
        
        -- Verificar stock si configurado
        IF NOT v_allow_negative THEN
          SELECT stock INTO v_current_stock 
          FROM current_stock 
          WHERE item_type = 'raw_material' AND item_id = v_recipe.raw_material_id;
          IF v_current_stock - v_movement_qty < 0 THEN
            RAISE EXCEPTION 'Stock insuficiente para materia prima %', v_recipe.raw_material_id;
          END IF;
        END IF;
      END LOOP;
    ELSE
      -- Producto retail: sale_out de sí mismo
      INSERT INTO inventory_movements (item_type, product_id, movement_type, quantity, order_id, performed_by)
      VALUES ('product', v_item.product_id, 'sale_out', v_item.quantity, p_order_id, p_user_id);
      
      IF NOT v_allow_negative THEN
        SELECT stock INTO v_current_stock 
        FROM current_stock 
        WHERE item_type = 'product' AND item_id = v_item.product_id;
        IF v_current_stock - v_item.quantity < 0 THEN
          RAISE EXCEPTION 'Stock insuficiente para producto %', v_item.product_id;
        END IF;
      END IF;
    END IF;
    
    -- Extras con raw_material vinculado (también con conversión)
    FOR v_extra IN
      SELECT oie.*, 
             pe.raw_material_id, 
             pe.raw_material_quantity,
             pe.unit_id as extra_unit_id,
             rm.unit_id as material_unit_id,
             u1.conversion_factor as extra_factor,
             u2.conversion_factor as material_factor
      FROM order_item_extras oie
      JOIN product_extras pe ON oie.extra_id = pe.id
      JOIN raw_materials rm ON pe.raw_material_id = rm.id
      JOIN units u1 ON pe.unit_id = u1.id
      JOIN units u2 ON rm.unit_id = u2.id
      WHERE oie.order_item_id = v_item.id AND pe.raw_material_id IS NOT NULL
    LOOP
      v_movement_qty := v_extra.raw_material_quantity * v_extra.quantity * v_item.quantity 
                       * COALESCE(v_extra.extra_factor,1) / COALESCE(v_extra.material_factor,1);
      INSERT INTO inventory_movements (item_type, raw_material_id, movement_type, quantity, unit_id, order_id, performed_by)
      VALUES ('raw_material', v_extra.raw_material_id, 'sale_out', v_movement_qty, v_extra.material_unit_id, p_order_id, p_user_id);
    END LOOP;
  END LOOP;
  
  -- Actualizar estado orden
  UPDATE orders SET status = 'confirmed', updated_at = now() WHERE id = p_order_id;
  
  -- Log historial de estados
  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by)
  VALUES (p_order_id, 'pending', 'confirmed', p_user_id);
END;
$$;

-- ----------------------------------------------------------------------------
-- FIN MIGRACIÓN FASE 2
-- ============================================================================