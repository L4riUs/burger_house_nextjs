-- ============================================================================
-- CAPTURA Y VERIFICACIÓN DE COMPROBANTES DE PAGO
-- (Pago Móvil / Binance / Zelle — extiende RF-14)
-- Regla de negocio acordada: una orden con comprobante 'pending' NO avanza
-- a cocina hasta que el staff apruebe el pago.
--
-- IDEMPOTENTE: puede ejecutarse varias veces sin error ni duplicados.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Tabla de comprobantes de pago vinculados a órdenes
-- ----------------------------------------------------------------------------

create table if not exists order_payment_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  payment_method_id uuid not null references payment_methods(id),
  reference_number text not null,          -- nº de operación / transferencia
  payer_phone text,                        -- solo pago_movil
  payer_id_number text,                    -- cédula del pagador, solo pago_movil
  receipt_path text not null,              -- ruta dentro del bucket 'payment-proofs'
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  review_notes text,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_proofs_order
  on order_payment_proofs(order_id);
create index if not exists idx_payment_proofs_status
  on order_payment_proofs(status, created_at desc);

alter table order_payment_proofs enable row level security;

-- Staff operativo puede ver los comprobantes (cajero es quien verifica cobros)
drop policy if exists "comprobantes_staff_lectura" on order_payment_proofs;
create policy "comprobantes_staff_lectura" on order_payment_proofs
  for select using (
    auth_role() in ('owner', 'admin', 'cajero', 'mesero')
  );

-- Staff puede revisar (aprobar/rechazar) los comprobantes
drop policy if exists "comprobantes_staff_revision" on order_payment_proofs;
create policy "comprobantes_staff_revision" on order_payment_proofs
  for update using (
    auth_role() in ('owner', 'admin', 'cajero')
  )
  with check (
    auth_role() in ('owner', 'admin', 'cajero')
  );

-- Inserción desde el checkout público (guest o autenticado).
-- La validación del vínculo orden-comprobante la hace el server action;
-- un invitado no tiene profile_id para acotar la política por usuario.
drop policy if exists "comprobantes_insercion_checkout" on order_payment_proofs;
create policy "comprobantes_insercion_checkout" on order_payment_proofs
  for insert to anon, authenticated with check (true);

-- ----------------------------------------------------------------------------
-- 2) Bucket privado de Storage para las fotos de comprobantes
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- Cualquier visitante puede subir su comprobante (server action valida tipo/tamaño)
drop policy if exists "comprobantes_storage_subir" on storage.objects;
create policy "comprobantes_storage_subir" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'payment-proofs');

-- Solo el staff operativo puede ver las imágenes
drop policy if exists "comprobantes_storage_leer" on storage.objects;
create policy "comprobantes_storage_leer" on storage.objects
  for select using (
    bucket_id = 'payment-proofs'
    and auth_role() in ('owner', 'admin', 'cajero', 'mesero')
  );

-- ----------------------------------------------------------------------------
-- 3) Seed: métodos de pago digitales con comprobante
-- Guard con not exists porque payment_methods no tiene unique sobre
-- provider_code (on conflict alone NO evitaría duplicados entre ejecuciones).
-- TODO(fase-metodos-pago): reemplazar con CRUD real de payment_methods
-- ----------------------------------------------------------------------------

insert into payment_methods (name, currency, provider_code, is_active)
select v.name, v.currency::currency_code, v.provider_code, true
from (values
  ('Binance Pay', 'USD', 'binance'),
  ('Zelle', 'USD', 'zelle')
) as v(name, currency, provider_code)
where not exists (
  select 1
  from payment_methods pm
  where pm.provider_code = v.provider_code
);
