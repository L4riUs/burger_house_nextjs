-- ============================================================================
-- FIX: Lectura de guest_customers por el staff operativo
-- (Issues POS/Órdenes — "Cliente desconocido" en admin/orders)
--
-- El join `guest_customer:guest_customers(...)` en listOrders devolvía null
-- porque guest_customers solo tenía política de INSERT (invitados_insercion),
-- no de SELECT. Sin RLS de lectura, el staff no veía la fila anidada y la UI
-- mostraba "Cliente desconocido".
--
-- IDEMPOTENTE: puede ejecutarse varias veces sin error.
-- ============================================================================

-- Staff operativo puede leer los guest_customers (para resolver el nombre en
-- las órdenes). El público sigue sin poder listar invitados.
drop policy if exists "invitados_staff_lectura" on guest_customers;
create policy "invitados_staff_lectura" on guest_customers
  for select using (
    auth_role() in ('owner', 'admin', 'cajero', 'mesero', 'cocina', 'delivery')
  );