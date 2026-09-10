-- ============================================================================
-- FASE 10: Triggers de Auditoría para Fases 7 y 8
-- Completa el logging en audit_log para operaciones sensibles faltantes
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Auditoría para Mesas (Fase 7) - restaurant_tables
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_restaurant_table_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
    VALUES (
      auth.uid(),
      'insert',
      'restaurant_tables',
      NEW.id,
      jsonb_build_object('after', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
    VALUES (
      auth.uid(),
      'update',
      'restaurant_tables',
      NEW.id,
      jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
    VALUES (
      auth.uid(),
      'delete',
      'restaurant_tables',
      OLD.id,
      jsonb_build_object('before', to_jsonb(OLD))
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_restaurant_tables ON restaurant_tables;
CREATE TRIGGER trg_audit_restaurant_tables
  AFTER INSERT OR UPDATE OR DELETE ON restaurant_tables
  FOR EACH ROW EXECUTE FUNCTION log_restaurant_table_change();

-- ----------------------------------------------------------------------------
-- 2. Auditoría para Reservas (Fase 7) - reservations
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_reservation_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
    VALUES (
      auth.uid(),
      'insert',
      'reservations',
      NEW.id,
      jsonb_build_object('after', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Log específico para cambios de estado (seated, cancelled, no_show)
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
      VALUES (
        auth.uid(),
        'status_change',
        'reservations',
        NEW.id,
        jsonb_build_object(
          'before', jsonb_build_object('status', OLD.status),
          'after', jsonb_build_object('status', NEW.status)
        )
      );
    ELSE
      INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
      VALUES (
        auth.uid(),
        'update',
        'reservations',
        NEW.id,
        jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
      );
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
    VALUES (
      auth.uid(),
      'delete',
      'reservations',
      OLD.id,
      jsonb_build_object('before', to_jsonb(OLD))
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_reservations ON reservations;
CREATE TRIGGER trg_audit_reservations
  AFTER INSERT OR UPDATE OR DELETE ON reservations
  FOR EACH ROW EXECUTE FUNCTION log_reservation_change();

-- ----------------------------------------------------------------------------
-- 3. Auditoría para Paquetes de Reservación (Fase 7) - reservation_packages
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_reservation_package_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
    VALUES (
      auth.uid(),
      'insert',
      'reservation_packages',
      NEW.id,
      jsonb_build_object('after', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
    VALUES (
      auth.uid(),
      'update',
      'reservation_packages',
      NEW.id,
      jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
    VALUES (
      auth.uid(),
      'delete',
      'reservation_packages',
      OLD.id,
      jsonb_build_object('before', to_jsonb(OLD))
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_reservation_packages ON reservation_packages;
CREATE TRIGGER trg_audit_reservation_packages
  AFTER INSERT OR UPDATE OR DELETE ON reservation_packages
  FOR EACH ROW EXECUTE FUNCTION log_reservation_package_change();

-- ----------------------------------------------------------------------------
-- 4. Auditoría para Sesiones de Caja (Fase 8) - cash_sessions
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_cash_session_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
    VALUES (
      auth.uid(),
      'insert',
      'cash_sessions',
      NEW.id,
      jsonb_build_object('after', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Log específico para apertura/cierre
    IF OLD.is_open IS DISTINCT FROM NEW.is_open THEN
      INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
      VALUES (
        auth.uid(),
        CASE WHEN NEW.is_open THEN 'cash_session_open' ELSE 'cash_session_close' END,
        'cash_sessions',
        NEW.id,
        jsonb_build_object(
          'before', jsonb_build_object('is_open', OLD.is_open, 'counted_amount_ves', OLD.counted_amount_ves, 'counted_amount_usd', OLD.counted_amount_usd),
          'after', jsonb_build_object('is_open', NEW.is_open, 'counted_amount_ves', NEW.counted_amount_ves, 'counted_amount_usd', NEW.counted_amount_usd)
        )
      );
    ELSE
      INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
      VALUES (
        auth.uid(),
        'update',
        'cash_sessions',
        NEW.id,
        jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
      );
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
    VALUES (
      auth.uid(),
      'delete',
      'cash_sessions',
      OLD.id,
      jsonb_build_object('before', to_jsonb(OLD))
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_cash_sessions ON cash_sessions;
CREATE TRIGGER trg_audit_cash_sessions
  AFTER INSERT OR UPDATE OR DELETE ON cash_sessions
  FOR EACH ROW EXECUTE FUNCTION log_cash_session_change();

-- ----------------------------------------------------------------------------
-- 5. Auditoría para Movimientos Financieros (Fase 8) - financial_transactions
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_financial_transaction_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
    VALUES (
      auth.uid(),
      'insert',
      'financial_transactions',
      NEW.id,
      jsonb_build_object('after', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
    VALUES (
      auth.uid(),
      'update',
      'financial_transactions',
      NEW.id,
      jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
    VALUES (
      auth.uid(),
      'delete',
      'financial_transactions',
      OLD.id,
      jsonb_build_object('before', to_jsonb(OLD))
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_financial_transactions ON financial_transactions;
CREATE TRIGGER trg_audit_financial_transactions
  AFTER INSERT OR UPDATE OR DELETE ON financial_transactions
  FOR EACH ROW EXECUTE FUNCTION log_financial_transaction_change();

-- ----------------------------------------------------------------------------
-- 6. Auditoría para Facturas/Notas de Crédito (Fase 8) - invoices
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_invoice_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
    VALUES (
      auth.uid(),
      'insert',
      'invoices',
      NEW.id,
      jsonb_build_object('after', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Log específico para anulación (nota de crédito)
    IF OLD.type = 'invoice' AND NEW.type = 'credit_note' THEN
      INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
      VALUES (
        auth.uid(),
        'invoice_void',
        'invoices',
        NEW.id,
        jsonb_build_object(
          'voided_invoice_id', NEW.reference_invoice_id,
          'credit_note_id', NEW.id
        )
      );
    ELSE
      INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
      VALUES (
        auth.uid(),
        'update',
        'invoices',
        NEW.id,
        jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
      );
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
    VALUES (
      auth.uid(),
      'delete',
      'invoices',
      OLD.id,
      jsonb_build_object('before', to_jsonb(OLD))
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_invoices ON invoices;
CREATE TRIGGER trg_audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION log_invoice_change();

-- ----------------------------------------------------------------------------
-- 7. Auditoría para Métodos de Pago (Fase 8) - payment_methods
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_payment_method_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
    VALUES (
      auth.uid(),
      'insert',
      'payment_methods',
      NEW.id,
      jsonb_build_object('after', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Log específico para activación/desactivación
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
      VALUES (
        auth.uid(),
        CASE WHEN NEW.is_active THEN 'payment_method_activate' ELSE 'payment_method_deactivate' END,
        'payment_methods',
        NEW.id,
        jsonb_build_object(
          'before', jsonb_build_object('is_active', OLD.is_active),
          'after', jsonb_build_object('is_active', NEW.is_active)
        )
      );
    ELSE
      INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
      VALUES (
        auth.uid(),
        'update',
        'payment_methods',
        NEW.id,
        jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
      );
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
    VALUES (
      auth.uid(),
      'delete',
      'payment_methods',
      OLD.id,
      jsonb_build_object('before', to_jsonb(OLD))
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_payment_methods ON payment_methods;
CREATE TRIGGER trg_audit_payment_methods
  AFTER INSERT OR UPDATE OR DELETE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION log_payment_method_change();

-- ----------------------------------------------------------------------------
-- 8. Auditoría para Órdenes - Cambios de Estado (ya existe order_status_history, 
--    pero agregamos a audit_log para consistencia transversal)
-- ----------------------------------------------------------------------------
-- Nota: order_status_history ya registra el historial detallado.
-- Aquí agregamos entrada en audit_log para cambios de estado críticos.

CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
    VALUES (
      auth.uid(),
      'order_status_change',
      'orders',
      NEW.id,
      jsonb_build_object(
        'before', jsonb_build_object('status', OLD.status),
        'after', jsonb_build_object('status', NEW.status)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_order_status ON orders;
CREATE TRIGGER trg_audit_order_status
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_order_status_change();

-- ----------------------------------------------------------------------------
-- 9. Auditoría para Movimientos de Inventario (Fase 3) - inventory_movements
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_inventory_movement_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
    VALUES (
      auth.uid(),
      'insert',
      'inventory_movements',
      NEW.id,
      jsonb_build_object('after', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
    VALUES (
      auth.uid(),
      'update',
      'inventory_movements',
      NEW.id,
      jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, diff)
    VALUES (
      auth.uid(),
      'delete',
      'inventory_movements',
      OLD.id,
      jsonb_build_object('before', to_jsonb(OLD))
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_inventory_movements ON inventory_movements;
CREATE TRIGGER trg_audit_inventory_movements
  AFTER INSERT OR UPDATE OR DELETE ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION log_inventory_movement_change();

-- ----------------------------------------------------------------------------
-- 10. Auditoría para Resolución de Conflictos Offline (Fase 9)
--     - Cuando se marca un pedido offline como conflict y luego se resuelve
-- ----------------------------------------------------------------------------
-- La tabla offline_orders está en IndexedDB (cliente), no en Postgres.
-- La sincronización llama a createOrder que ya audita via trigger de orders.
-- Pero agregamos auditoría específica para cuando se resuelve manualmente un conflicto
-- (editando el pedido offline y reintentando).

-- Nota: No hay tabla server-side para cola offline. La auditoría del flujo offline
-- queda cubierta por:
-- 1. createOrder (audita via orders trigger)
-- 2. order_status_change (audita transiciones)
-- 3. inventory_movements (audita descuento de stock al confirmar)
-- Si en el futuro se agrega tabla server-side para offline queue, agregar trigger aquí.

-- ----------------------------------------------------------------------------
-- 11. Permisos - audit_log solo lectura para owner/admin (ya existe en phase1_rls_policies.sql)
-- ----------------------------------------------------------------------------