-- ============================================================================
-- FASE 6: ÓRDENES - Migración para confirm_order_with_inventory y políticas RLS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Función atómica para confirmar orden y descontar inventario (RB-01)
-- CON CONVERSIÓN DE UNIDADES (Fase 2)
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
-- Función helper para cambios de estado genéricos (usada por cocina, delivery, panel)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION advance_order_status(p_order_id uuid, p_new_status order_status, p_user_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_current_status order_status;
  v_valid_transition boolean;
BEGIN
  -- Obtener estado actual con lock
  SELECT status INTO v_current_status FROM orders WHERE id = p_order_id FOR UPDATE;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Orden no encontrada';
  END IF;
  
  -- Validar transición usando la misma lógica que el cliente (duplicada intencionalmente en BD para integridad)
  v_valid_transition := CASE
    WHEN v_current_status = 'pending' AND p_new_status IN ('confirmed', 'cancelled') THEN true
    WHEN v_current_status = 'confirmed' AND p_new_status IN ('in_kitchen', 'cancelled') THEN true
    WHEN v_current_status = 'in_kitchen' AND p_new_status IN ('ready', 'cancelled') THEN true
    WHEN v_current_status = 'ready' AND p_new_status IN ('out_for_delivery', 'served', 'cancelled') THEN true
    WHEN v_current_status = 'out_for_delivery' AND p_new_status IN ('completed', 'cancelled') THEN true
    WHEN v_current_status = 'served' AND p_new_status IN ('completed', 'cancelled') THEN true
    ELSE false
  END;
  
  IF NOT v_valid_transition THEN
    RAISE EXCEPTION 'Transición inválida: % -> %', v_current_status, p_new_status;
  END IF;
  
  -- Actualizar estado
  UPDATE orders SET status = p_new_status, updated_at = now() WHERE id = p_order_id;
  
  -- Log historial
  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by)
  VALUES (p_order_id, v_current_status, p_new_status, p_user_id);
END;
$$;

-- ----------------------------------------------------------------------------
-- Función para asignar repartidor (previene concurrencia con WHERE delivery_profile_id IS NULL)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assign_delivery_driver(p_order_id uuid, p_driver_id uuid)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  v_updated boolean;
BEGIN
  UPDATE orders 
  SET delivery_profile_id = p_driver_id, 
      status = 'out_for_delivery',
      updated_at = now()
  WHERE id = p_order_id 
    AND fulfillment_type = 'delivery'
    AND status = 'ready'
    AND delivery_profile_id IS NULL;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  IF v_updated THEN
    INSERT INTO order_status_history (order_id, from_status, to_status, changed_by)
    VALUES (p_order_id, 'ready', 'out_for_delivery', p_driver_id);
  END IF;
  
  RETURN v_updated;
END;
$$;

-- ----------------------------------------------------------------------------
-- Función para marcar delivery como completado
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION complete_delivery(p_order_id uuid, p_user_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_current_status order_status;
BEGIN
  SELECT status INTO v_current_status FROM orders WHERE id = p_order_id FOR UPDATE;
  
  IF v_current_status <> 'out_for_delivery' THEN
    RAISE EXCEPTION 'Solo se pueden completar entregas en estado out_for_delivery';
  END IF;
  
  UPDATE orders SET status = 'completed', updated_at = now() WHERE id = p_order_id;
  
  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by)
  VALUES (p_order_id, 'out_for_delivery', 'completed', p_user_id);
END;
$$;

-- ----------------------------------------------------------------------------
-- Políticas RLS para órdenes
-- ----------------------------------------------------------------------------

-- Staff (owner, admin, cajero, mesero, cocina, delivery) ve todas las órdenes
DROP POLICY IF EXISTS "orders_staff_read" ON orders;
CREATE POLICY "orders_staff_read" ON orders
  FOR SELECT USING (auth_role() IN ('owner','admin','cajero','mesero','cocina','delivery'));

-- Clientes ven solo sus propias órdenes
DROP POLICY IF EXISTS "orders_customer_read" ON orders;
CREATE POLICY "orders_customer_read" ON orders
  FOR SELECT USING (profile_id = auth.uid());

-- Staff puede crear órdenes (para POS interno)
DROP POLICY IF EXISTS "orders_staff_insert" ON orders;
CREATE POLICY "orders_staff_insert" ON orders
  FOR INSERT WITH CHECK (auth_role() IN ('owner','admin','cajero','mesero'));

-- Staff puede actualizar órdenes (transiciones de estado)
DROP POLICY IF EXISTS "orders_staff_update" ON orders;
CREATE POLICY "orders_staff_update" ON orders
  FOR UPDATE USING (auth_role() IN ('owner','admin','cajero','mesero','cocina','delivery'));

-- ----------------------------------------------------------------------------
-- Políticas RLS específicas para Cocina
-- ----------------------------------------------------------------------------

-- Cocina ve órdenes confirmed/in_kitchen/ready
DROP POLICY IF EXISTS "kitchen_orders_read" ON orders;
CREATE POLICY "kitchen_orders_read" ON orders
  FOR SELECT USING (auth_role() IN ('owner','admin','cocina') AND status IN ('confirmed','in_kitchen','ready'));

-- Cocina puede avanzar confirmed -> in_kitchen -> ready
DROP POLICY IF EXISTS "kitchen_orders_advance" ON orders;
CREATE POLICY "kitchen_orders_advance" ON orders
  FOR UPDATE USING (auth_role() IN ('owner','admin','cocina') AND status IN ('confirmed','in_kitchen'));

-- ----------------------------------------------------------------------------
-- Políticas RLS específicas para Delivery
-- ----------------------------------------------------------------------------

-- Delivery ve órdenes ready/out_for_delivery con fulfillment_type = delivery
DROP POLICY IF EXISTS "delivery_orders_read" ON orders;
CREATE POLICY "delivery_orders_read" ON orders
  FOR SELECT USING (auth_role() IN ('owner','admin','delivery') AND fulfillment_type = 'delivery' AND status IN ('ready','out_for_delivery'));

-- Delivery puede tomar órdenes ready (assign_delivery_driver)
DROP POLICY IF EXISTS "delivery_orders_take" ON orders;
CREATE POLICY "delivery_orders_take" ON orders
  FOR UPDATE USING (auth_role() IN ('owner','admin','delivery') AND fulfillment_type = 'delivery' AND status = 'ready');

-- Delivery puede completar órdenes out_for_delivery
DROP POLICY IF EXISTS "delivery_orders_complete" ON orders;
CREATE POLICY "delivery_orders_complete" ON orders
  FOR UPDATE USING (auth_role() IN ('owner','admin','delivery') AND fulfillment_type = 'delivery' AND status = 'out_for_delivery');

-- ----------------------------------------------------------------------------
-- Políticas RLS para order_items, order_item_extras, order_status_history
-- (heredan acceso via FK a orders, pero agregamos políticas explícitas)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "order_items_staff_read" ON order_items;
CREATE POLICY "order_items_staff_read" ON order_items
  FOR SELECT USING (auth_role() IN ('owner','admin','cajero','mesero','cocina','delivery'));

DROP POLICY IF EXISTS "order_items_customer_read" ON order_items;
CREATE POLICY "order_items_customer_read" ON order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "order_items_staff_insert" ON order_items;
CREATE POLICY "order_items_staff_insert" ON order_items
  FOR INSERT WITH CHECK (auth_role() IN ('owner','admin','cajero','mesero'));

DROP POLICY IF EXISTS "order_item_extras_staff_read" ON order_item_extras;
CREATE POLICY "order_item_extras_staff_read" ON order_item_extras
  FOR SELECT USING (auth_role() IN ('owner','admin','cajero','mesero','cocina','delivery'));

DROP POLICY IF EXISTS "order_item_extras_customer_read" ON order_item_extras;
CREATE POLICY "order_item_extras_customer_read" ON order_item_extras
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_extras.order_item_id AND o.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "order_item_extras_staff_insert" ON order_item_extras;
CREATE POLICY "order_item_extras_staff_insert" ON order_item_extras
  FOR INSERT WITH CHECK (auth_role() IN ('owner','admin','cajero','mesero'));

DROP POLICY IF EXISTS "order_status_history_staff_read" ON order_status_history;
CREATE POLICY "order_status_history_staff_read" ON order_status_history
  FOR SELECT USING (auth_role() IN ('owner','admin','cajero','mesero','cocina','delivery'));

DROP POLICY IF EXISTS "order_status_history_customer_read" ON order_status_history;
CREATE POLICY "order_status_history_customer_read" ON order_status_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_status_history.order_id AND orders.profile_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- Habilitar RLS en tablas nuevas (por si no están habilitadas)
-- ----------------------------------------------------------------------------
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;