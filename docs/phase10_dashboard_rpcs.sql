-- ============================================================================
-- FASE 10: Dashboard KPIs - Funciones RPC y Vistas Agregadas
-- Consultas agregadas en el servidor para evitar traer todo el histórico al cliente
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. KPIs de Ventas por Rango de Fecha
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_sales_kpis(
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  total_ves numeric,
  total_usd numeric,
  orders_count bigint,
  avg_ticket_ves numeric,
  avg_ticket_usd numeric
) LANGUAGE plpgsql AS $$
DECLARE
  v_date_from timestamptz := COALESCE(p_date_from, (now() - interval '30 days'));
  v_date_to timestamptz := COALESCE(p_date_to, now());
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ft.amount) FILTER (WHERE ft.currency = 'VES'), 0)::numeric AS total_ves,
    COALESCE(SUM(ft.amount) FILTER (WHERE ft.currency = 'USD'), 0)::numeric AS total_usd,
    COUNT(DISTINCT ft.order_id) AS orders_count,
    CASE 
      WHEN COUNT(DISTINCT ft.order_id) > 0 
      THEN COALESCE(SUM(ft.amount) FILTER (WHERE ft.currency = 'VES'), 0) / COUNT(DISTINCT ft.order_id)
      ELSE 0
    END::numeric AS avg_ticket_ves,
    CASE 
      WHEN COUNT(DISTINCT ft.order_id) > 0 
      THEN COALESCE(SUM(ft.amount) FILTER (WHERE ft.currency = 'USD'), 0) / COUNT(DISTINCT ft.order_id)
      ELSE 0
    END::numeric AS avg_ticket_usd
  FROM financial_transactions ft
  WHERE ft.txn_type = 'sale'
    AND ft.created_at >= v_date_from
    AND ft.created_at <= v_date_to;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Órdenes por Estado
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_orders_by_status(
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  status order_status,
  count bigint
) LANGUAGE plpgsql AS $$
DECLARE
  v_date_from timestamptz := COALESCE(p_date_from, (now() - interval '30 days'));
  v_date_to timestamptz := COALESCE(p_date_to, now());
BEGIN
  RETURN QUERY
  SELECT
    o.status,
    COUNT(*)::bigint AS count
  FROM orders o
  WHERE o.created_at >= v_date_from
    AND o.created_at <= v_date_to
  GROUP BY o.status
  ORDER BY count DESC;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Top N Productos Vendidos
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_top_products_sold(
  p_limit int DEFAULT 10,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  product_id uuid,
  product_name jsonb,
  product_type product_type,
  total_quantity bigint,
  total_revenue_ves numeric,
  total_revenue_usd numeric
) LANGUAGE plpgsql AS $$
DECLARE
  v_date_from timestamptz := COALESCE(p_date_from, (now() - interval '30 days'));
  v_date_to timestamptz := COALESCE(p_date_to, now());
BEGIN
  RETURN QUERY
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.product_type,
    SUM(oi.quantity)::bigint AS total_quantity,
    SUM(oi.unit_price_ves * oi.quantity)::numeric AS total_revenue_ves,
    SUM(oi.unit_price_usd * oi.quantity)::numeric AS total_revenue_usd
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  JOIN products p ON oi.product_id = p.id
  WHERE o.status IN ('confirmed', 'in_kitchen', 'ready', 'out_for_delivery', 'served', 'completed')
    AND o.created_at >= v_date_from
    AND o.created_at <= v_date_to
  GROUP BY p.id, p.name, p.product_type
  ORDER BY total_quantity DESC
  LIMIT p_limit;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Top N Combos Vendidos
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_top_combos_sold(
  p_limit int DEFAULT 10,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  combo_id uuid,
  combo_name jsonb,
  total_quantity bigint,
  total_revenue_ves numeric,
  total_revenue_usd numeric
) LANGUAGE plpgsql AS $$
DECLARE
  v_date_from timestamptz := COALESCE(p_date_from, (now() - interval '30 days'));
  v_date_to timestamptz := COALESCE(p_date_to, now());
BEGIN
  RETURN QUERY
  SELECT
    c.id AS combo_id,
    c.name AS combo_name,
    SUM(oi.quantity)::bigint AS total_quantity,
    SUM(oi.unit_price_ves * oi.quantity)::numeric AS total_revenue_ves,
    SUM(oi.unit_price_usd * oi.quantity)::numeric AS total_revenue_usd
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  JOIN combos c ON oi.combo_id = c.id
  WHERE o.status IN ('confirmed', 'in_kitchen', 'ready', 'out_for_delivery', 'served', 'completed')
    AND o.created_at >= v_date_from
    AND o.created_at <= v_date_to
  GROUP BY c.id, c.name
  ORDER BY total_quantity DESC
  LIMIT p_limit;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Estado de Caja Actual
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_cash_session_status()
RETURNS TABLE (
  session_id uuid,
  is_open boolean,
  opening_amount_ves numeric,
  opening_amount_usd numeric,
  expected_amount_ves numeric,
  expected_amount_usd numeric,
  counted_amount_ves numeric,
  counted_amount_usd numeric,
  opened_at timestamptz,
  opened_by_name text
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id AS session_id,
    cs.is_open,
    cs.opening_amount_ves,
    cs.opening_amount_usd,
    cs.expected_amount_ves,
    cs.expected_amount_usd,
    cs.counted_amount_ves,
    cs.counted_amount_usd,
    cs.opened_at,
    p.full_name AS opened_by_name
  FROM cash_sessions cs
  LEFT JOIN profiles p ON cs.opened_by = p.id
  WHERE cs.is_open = true
  LIMIT 1;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. Alertas de Stock Bajo (reutiliza vista current_stock)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_low_stock_alerts()
RETURNS TABLE (
  item_type inventory_item_type,
  item_id uuid,
  item_name text,
  current_stock numeric,
  min_stock numeric,
  unit_abbreviation text,
  deficit numeric
) LANGUAGE plpgsql AS $$
BEGIN
  -- Materias primas
  RETURN QUERY
  SELECT
    'raw_material'::inventory_item_type AS item_type,
    rm.id AS item_id,
    rm.name AS item_name,
    cs.stock AS current_stock,
    rm.min_stock,
    u.abbreviation AS unit_abbreviation,
    (rm.min_stock - cs.stock) AS deficit
  FROM raw_materials rm
  JOIN current_stock cs ON cs.item_type = 'raw_material' AND cs.item_id = rm.id
  JOIN units u ON rm.unit_id = u.id
  WHERE rm.deleted_at IS NULL
    AND cs.stock < rm.min_stock
  
  UNION ALL
  
  -- Productos retail
  SELECT
    'product'::inventory_item_type AS item_type,
    p.id AS item_id,
    (p.name->>'es') AS item_name,
    cs.stock AS current_stock,
    p.min_stock,
    u.abbreviation AS unit_abbreviation,
    (p.min_stock - cs.stock) AS deficit
  FROM products p
  JOIN current_stock cs ON cs.item_type = 'product' AND cs.item_id = p.id
  JOIN units u ON p.unit_id = u.id  -- productos retail no tienen unit_id, pero usamos una base
  WHERE p.deleted_at IS NULL
    AND p.product_type = 'retail'
    AND p.is_active = true
    AND cs.stock < p.min_stock
  
  ORDER BY deficit DESC;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. Ventas por Canal (storefront/pos/phone)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_sales_by_channel(
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  channel order_channel,
  orders_count bigint,
  total_ves numeric,
  total_usd numeric
) LANGUAGE plpgsql AS $$
DECLARE
  v_date_from timestamptz := COALESCE(p_date_from, (now() - interval '30 days'));
  v_date_to timestamptz := COALESCE(p_date_to, now());
BEGIN
  RETURN QUERY
  SELECT
    o.channel,
    COUNT(*)::bigint AS orders_count,
    COALESCE(SUM(o.total_ves), 0)::numeric AS total_ves,
    COALESCE(SUM(o.total_usd), 0)::numeric AS total_usd
  FROM orders o
  WHERE o.status IN ('completed')
    AND o.created_at >= v_date_from
    AND o.created_at <= v_date_to
  GROUP BY o.channel
  ORDER BY orders_count DESC;
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. Ventas por Tipo de Cumplimiento (dine_in/pickup/delivery)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_sales_by_fulfillment(
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  fulfillment_type fulfillment_type,
  orders_count bigint,
  total_ves numeric,
  total_usd numeric
) LANGUAGE plpgsql AS $$
DECLARE
  v_date_from timestamptz := COALESCE(p_date_from, (now() - interval '30 days'));
  v_date_to timestamptz := COALESCE(p_date_to, now());
BEGIN
  RETURN QUERY
  SELECT
    o.fulfillment_type,
    COUNT(*)::bigint AS orders_count,
    COALESCE(SUM(o.total_ves), 0)::numeric AS total_ves,
    COALESCE(SUM(o.total_usd), 0)::numeric AS total_usd
  FROM orders o
  WHERE o.status IN ('completed')
    AND o.created_at >= v_date_from
    AND o.created_at <= v_date_to
  GROUP BY o.fulfillment_type
  ORDER BY orders_count DESC;
END;
$$;

-- ----------------------------------------------------------------------------
-- 9. Reporte de Ventas Detallado (para exportación)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_sales_report(
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 100
)
RETURNS TABLE (
  order_number bigint,
  created_at timestamptz,
  channel order_channel,
  fulfillment_type fulfillment_type,
  status order_status,
  customer_name text,
  total_ves numeric,
  total_usd numeric,
  currency currency_code,
  exchange_rate numeric,
  payment_method_name text
) LANGUAGE plpgsql AS $$
DECLARE
  v_date_from timestamptz := COALESCE(p_date_from, (now() - interval '30 days'));
  v_date_to timestamptz := COALESCE(p_date_to, now());
  v_from int := (p_page - 1) * p_page_size;
  v_to int := v_from + p_page_size - 1;
BEGIN
  RETURN QUERY
  SELECT
    o.order_number,
    o.created_at,
    o.channel,
    o.fulfillment_type,
    o.status,
    COALESCE(p.full_name, gc.full_name, 'Sin cliente') AS customer_name,
    o.total_ves,
    o.total_usd,
    o.currency,
    o.exchange_rate,
    pm.name AS payment_method_name
  FROM orders o
  LEFT JOIN profiles p ON o.profile_id = p.id
  LEFT JOIN guest_customers gc ON o.guest_customer_id = gc.id
  LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
  WHERE o.created_at >= v_date_from
    AND o.created_at <= v_date_to
    AND o.status IN ('completed', 'cancelled')
  ORDER BY o.created_at DESC
  LIMIT p_page_size OFFSET v_from;
END;
$$;

-- ----------------------------------------------------------------------------
-- 10. Reporte de Inventario (para exportación)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_inventory_report(
  p_item_type inventory_item_type DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 100
)
RETURNS TABLE (
  item_type inventory_item_type,
  item_name text,
  movement_type movement_type,
  quantity numeric,
  unit_cost numeric,
  unit_abbreviation text,
  supplier_name text,
  performed_by_name text,
  created_at timestamptz,
  note text
) LANGUAGE plpgsql AS $$
DECLARE
  v_date_from timestamptz := COALESCE(p_date_from, (now() - interval '30 days'));
  v_date_to timestamptz := COALESCE(p_date_to, now());
  v_from int := (p_page - 1) * p_page_size;
  v_to int := v_from + p_page_size - 1;
BEGIN
  RETURN QUERY
  SELECT
    im.item_type,
    COALESCE(rm.name, (pr.name->>'es'), 'Producto') AS item_name,
    im.movement_type,
    im.quantity,
    im.unit_cost,
    u.abbreviation AS unit_abbreviation,
    s.name AS supplier_name,
    p.full_name AS performed_by_name,
    im.created_at,
    im.note
  FROM inventory_movements im
  LEFT JOIN raw_materials rm ON im.raw_material_id = rm.id
  LEFT JOIN products pr ON im.product_id = pr.id
  LEFT JOIN units u ON im.unit_id = u.id
  LEFT JOIN suppliers s ON im.supplier_id = s.id
  LEFT JOIN profiles p ON im.performed_by = p.id
  WHERE im.created_at >= v_date_from
    AND im.created_at <= v_date_to
    AND (p_item_type IS NULL OR im.item_type = p_item_type)
  ORDER BY im.created_at DESC
  LIMIT p_page_size OFFSET v_from;
END;
$$;

-- ----------------------------------------------------------------------------
-- 11. Reporte de Caja/Finanzas (para exportación)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_cash_report(
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_txn_type financial_txn_type DEFAULT NULL,
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  txn_type financial_txn_type,
  currency currency_code,
  amount numeric,
  exchange_rate numeric,
  description text,
  performed_by_name text,
  cash_session_id uuid,
  session_opened_at timestamptz,
  order_number bigint,
  supplier_name text,
  created_at timestamptz
) LANGUAGE plpgsql AS $$
DECLARE
  v_date_from timestamptz := COALESCE(p_date_from, (now() - interval '30 days'));
  v_date_to timestamptz := COALESCE(p_date_to, now());
  v_from int := (p_page - 1) * p_page_size;
  v_to int := v_from + p_page_size - 1;
BEGIN
  RETURN QUERY
  SELECT
    ft.id,
    ft.txn_type,
    ft.currency,
    ft.amount,
    ft.exchange_rate,
    ft.description,
    p.full_name AS performed_by_name,
    ft.cash_session_id,
    cs.opened_at AS session_opened_at,
    o.order_number,
    s.name AS supplier_name,
    ft.created_at
  FROM financial_transactions ft
  LEFT JOIN profiles p ON ft.performed_by = p.id
  LEFT JOIN cash_sessions cs ON ft.cash_session_id = cs.id
  LEFT JOIN orders o ON ft.order_id = o.id
  LEFT JOIN suppliers s ON ft.supplier_id = s.id
  WHERE ft.created_at >= v_date_from
    AND ft.created_at <= v_date_to
    AND (p_txn_type IS NULL OR ft.txn_type = p_txn_type)
  ORDER BY ft.created_at DESC
  LIMIT p_page_size OFFSET v_from;
END;
$$;

-- ----------------------------------------------------------------------------
-- 12. Conteo total para paginación de reportes
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION count_sales_report(
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE
  v_date_from timestamptz := COALESCE(p_date_from, (now() - interval '30 days'));
  v_date_to timestamptz := COALESCE(p_date_to, now());
  v_count bigint;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM orders o
  WHERE o.created_at >= v_date_from
    AND o.created_at <= v_date_to
    AND o.status IN ('completed', 'cancelled');
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION count_inventory_report(
  p_item_type inventory_item_type DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE
  v_date_from timestamptz := COALESCE(p_date_from, (now() - interval '30 days'));
  v_date_to timestamptz := COALESCE(p_date_to, now());
  v_count bigint;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM inventory_movements im
  WHERE im.created_at >= v_date_from
    AND im.created_at <= v_date_to
    AND (p_item_type IS NULL OR im.item_type = p_item_type);
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION count_cash_report(
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_txn_type financial_txn_type DEFAULT NULL
)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE
  v_date_from timestamptz := COALESCE(p_date_from, (now() - interval '30 days'));
  v_date_to timestamptz := COALESCE(p_date_to, now());
  v_count bigint;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM financial_transactions ft
  WHERE ft.created_at >= v_date_from
    AND ft.created_at <= v_date_to
    AND (p_txn_type IS NULL OR ft.txn_type = p_txn_type);
  RETURN v_count;
END;
$$;

-- ----------------------------------------------------------------------------
-- 13. Permisos de ejecución (ejecutar como service_role o admin)
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION get_sales_kpis TO authenticated;
GRANT EXECUTE ON FUNCTION get_orders_by_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_products_sold TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_combos_sold TO authenticated;
GRANT EXECUTE ON FUNCTION get_cash_session_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_low_stock_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_by_channel TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_by_fulfillment TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_report TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_report TO authenticated;
GRANT EXECUTE ON FUNCTION get_cash_report TO authenticated;
GRANT EXECUTE ON FUNCTION count_sales_report TO authenticated;
GRANT EXECUTE ON FUNCTION count_inventory_report TO authenticated;
GRANT EXECUTE ON FUNCTION count_cash_report TO authenticated;