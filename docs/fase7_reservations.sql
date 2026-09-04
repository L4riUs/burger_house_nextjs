-- ============================================================================
-- FASE 7: Mesas, Reservas y Paquetes de Reservación
-- ============================================================================
-- Ejecutar en el SQL Editor de Supabase.
-- Idempotente: puede ejecutarse varias veces sin error.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TRIGGER: Sincronización automática de estado de mesa con órdenes
-- ----------------------------------------------------------------------------
-- Cuando se crea una orden dine_in → mesa a 'occupied'.
-- Cuando se completa/cancena una orden dine_in → mesa a 'available' si no
-- hay otras órdenes activas en esa mesa.

CREATE OR REPLACE FUNCTION sync_table_status_for_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table_id uuid;
  v_active_orders int;
BEGIN
  -- ── DELETE ──────────────────────────────────────────────────────────────
  IF TG_OP = 'DELETE' THEN
    IF OLD.fulfillment_type <> 'dine_in' OR OLD.table_id IS NULL THEN
      RETURN OLD;
    END IF;

    SELECT count(*) INTO v_active_orders
    FROM orders
    WHERE table_id = OLD.table_id
      AND fulfillment_type = 'dine_in'
      AND status NOT IN ('completed', 'cancelled');

    IF v_active_orders = 0 THEN
      UPDATE restaurant_tables
      SET status = 'available', updated_at = now()
      WHERE id = OLD.table_id;
    END IF;

    RETURN OLD;
  END IF;

  -- ── Para INSERT / UPDATE: ignorar si no es dine_in ──────────────────────
  IF NEW.fulfillment_type <> 'dine_in' OR NEW.table_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- ── INSERT ──────────────────────────────────────────────────────────────
  IF TG_OP = 'INSERT' THEN
    UPDATE restaurant_tables
    SET status = 'occupied', updated_at = now()
    WHERE id = NEW.table_id;
    RETURN NEW;
  END IF;

  -- ── UPDATE ──────────────────────────────────────────────────────────────
  IF NEW.status IN ('completed', 'cancelled') THEN
    SELECT count(*) INTO v_active_orders
    FROM orders
    WHERE table_id = NEW.table_id
      AND fulfillment_type = 'dine_in'
      AND status NOT IN ('completed', 'cancelled')
      AND id <> NEW.id;

    IF v_active_orders = 0 THEN
      UPDATE restaurant_tables
      SET status = 'available', updated_at = now()
      WHERE id = NEW.table_id;
    END IF;
  ELSE
    -- status sigue activo (confirmed, in_kitchen, ready, served, etc.)
    UPDATE restaurant_tables
    SET status = 'occupied', updated_at = now()
    WHERE id = NEW.table_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_sync_table ON orders;
CREATE TRIGGER trg_orders_sync_table
  AFTER INSERT OR UPDATE OF status OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION sync_table_status_for_orders();

-- ----------------------------------------------------------------------------
-- 2. RLS: restaurant_tables
-- ----------------------------------------------------------------------------
-- Ya existe "mesas_publico_lectura" (lectura pública storefront). No se toca.

DROP POLICY IF EXISTS "tables_staff_read" ON restaurant_tables;
CREATE POLICY "tables_staff_read" ON restaurant_tables
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND auth_role() IN ('owner','admin','cajero','mesero','cocina','delivery')
  );

DROP POLICY IF EXISTS "tables_admin_write" ON restaurant_tables;
CREATE POLICY "tables_admin_write" ON restaurant_tables
  FOR ALL TO authenticated
  USING (auth_role() IN ('owner','admin'))
  WITH CHECK (auth_role() IN ('owner','admin'));

DROP POLICY IF EXISTS "tables_staff_update" ON restaurant_tables;
CREATE POLICY "tables_staff_update" ON restaurant_tables
  FOR UPDATE TO authenticated
  USING (auth_role() IN ('owner','admin','cajero','mesero'))
  WITH CHECK (auth_role() IN ('owner','admin','cajero','mesero'));

-- ----------------------------------------------------------------------------
-- 3. RLS: reservation_packages
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "res_packages_staff_read" ON reservation_packages;
CREATE POLICY "res_packages_staff_read" ON reservation_packages
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND auth_role() IN ('owner','admin','cajero','mesero')
  );

DROP POLICY IF EXISTS "res_packages_admin_write" ON reservation_packages;
CREATE POLICY "res_packages_admin_write" ON reservation_packages
  FOR ALL TO authenticated
  USING (auth_role() IN ('owner','admin'))
  WITH CHECK (auth_role() IN ('owner','admin'));

-- ----------------------------------------------------------------------------
-- 4. RLS: reservation_package_tables
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "res_pkg_tables_staff_read" ON reservation_package_tables;
CREATE POLICY "res_pkg_tables_staff_read" ON reservation_package_tables
  FOR SELECT TO authenticated
  USING (auth_role() IN ('owner','admin','cajero','mesero'));

DROP POLICY IF EXISTS "res_pkg_tables_admin_write" ON reservation_package_tables;
CREATE POLICY "res_pkg_tables_admin_write" ON reservation_package_tables
  FOR ALL TO authenticated
  USING (auth_role() IN ('owner','admin'))
  WITH CHECK (auth_role() IN ('owner','admin'));

-- ----------------------------------------------------------------------------
-- 5. RLS: reservations
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "reservations_staff_read" ON reservations;
CREATE POLICY "reservations_staff_read" ON reservations
  FOR SELECT TO authenticated
  USING (auth_role() IN ('owner','admin','cajero','mesero'));

DROP POLICY IF EXISTS "reservations_own_read" ON reservations;
CREATE POLICY "reservations_own_read" ON reservations
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "reservations_staff_write" ON reservations;
CREATE POLICY "reservations_staff_write" ON reservations
  FOR ALL TO authenticated
  USING (auth_role() IN ('owner','admin','cajero','mesero'))
  WITH CHECK (auth_role() IN ('owner','admin','cajero','mesero'));

-- ----------------------------------------------------------------------------
-- 6. RLS: profiles (lectura de clientes para el staff de reservas)
-- ----------------------------------------------------------------------------
-- El staff que gestiona reservas necesita ver los clientes registrados para
-- poder asignarlos desde el modal de registro. Complementa la política de la
-- fase 1 "profiles_select_own_or_admin" (que solo permite owner/admin leer
-- perfiles ajenos). Sin esta política, cajero/mesero ven la lista de clientes
-- vacía al elegir "Registrado".
DROP POLICY IF EXISTS "profiles_staff_read_clients" ON profiles;
CREATE POLICY "profiles_staff_read_clients" ON profiles
  FOR SELECT TO authenticated
  USING (auth_role() IN ('owner','admin','cajero','mesero') AND role = 'cliente');;
