-- ============================================================================
-- FIX RLS: order_status_history
-- La función confirm_order_with_inventory (no SECURITY DEFINER) inserta en
-- order_status_history bajo RLS del usuario llamador. Si la política de INSERT
-- staff (phase6_orders_migration.sql) no está aplicada a la BD, el insert se
-- rechaza con "violates row-level security policy". Este script aplica las
-- políticas de INSERT/SELECT de forma idempotente.
-- ============================================================================

-- Staff (owner, admin, cajero, mesero, cocina, delivery) registra historial
DROP POLICY IF EXISTS "order_status_history_staff_insert" ON order_status_history;
CREATE POLICY "order_status_history_staff_insert" ON order_status_history
  FOR INSERT WITH CHECK (auth_role() IN ('owner','admin','cajero','mesero','cocina','delivery'));

DROP POLICY IF EXISTS "order_status_history_staff_read" ON order_status_history;
CREATE POLICY "order_status_history_staff_read" ON order_status_history
  FOR SELECT USING (auth_role() IN ('owner','admin','cajero','mesero','cocina','delivery'));

-- Clientes ven el historial de sus propias órdenes
DROP POLICY IF EXISTS "order_status_history_customer_read" ON order_status_history;
CREATE POLICY "order_status_history_customer_read" ON order_status_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_status_history.order_id AND orders.profile_id = auth.uid())
  );

-- Storefront (checkout/cliente anon) registra y lee su historial
DROP POLICY IF EXISTS "order_status_history_storefront_insert" ON order_status_history;
CREATE POLICY "order_status_history_storefront_insert" ON order_status_history
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_status_history.order_id AND orders.channel = 'storefront')
  );

DROP POLICY IF EXISTS "order_status_history_storefront_read" ON order_status_history;
CREATE POLICY "order_status_history_storefront_read" ON order_status_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_status_history.order_id AND orders.channel = 'storefront')
  );

-- ============================================================================
-- FIN FIX RLS
-- ============================================================================