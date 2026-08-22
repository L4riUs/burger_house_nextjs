-- ============================================================================
-- BURGER HOUSE — Esquema de base de datos (Supabase / PostgreSQL)
-- Corresponde a docs/SRS_BurgerHouse.md v2.0
-- Convenciones:
--   - snake_case en todo.
--   - Toda tabla de negocio tiene: id uuid, created_at, updated_at.
--   - Soft-delete via deleted_at donde aplica (ver SRS 3.2, Papelera).
--   - Campos traducibles: JSONB {"es": "...", "en": "..."} (ver AGENTS.md
--     getLocalizedField helper).
--   - Todo monto monetario va acompañado de moneda + tasa de cambio snapshot
--     (RB-04 del SRS).
--   - single-tenant hoy; se deja `branch_id` nullable en las tablas
--     operativas más probables para no romper nada si en el futuro se abre
--     una segunda sede (no se activa lógica multi-sede en v1).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. EXTENSIONES Y TIPOS
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

create type user_role as enum (
  'owner', 'admin', 'cajero', 'mesero', 'cocina', 'delivery', 'cliente'
);

create type product_type as enum ('prepared', 'retail');

create type category_target as enum ('product', 'raw_material');

create type unit_type as enum ('mass', 'volume', 'count');

create type movement_type as enum (
  'purchase_in', 'sale_out', 'adjustment_in', 'adjustment_out',
  'waste', 'transfer_in', 'transfer_out'
);

create type inventory_item_type as enum ('raw_material', 'product');

create type fulfillment_type as enum ('dine_in', 'pickup', 'delivery');

create type order_status as enum (
  'pending', 'confirmed', 'in_kitchen', 'ready',
  'out_for_delivery', 'served', 'completed', 'cancelled'
);

create type reservation_status as enum (
  'pending', 'confirmed', 'seated', 'cancelled', 'no_show'
);

create type table_status as enum (
  'available', 'occupied', 'reserved', 'out_of_service'
);

create type financial_txn_type as enum (
  'sale', 'expense', 'capital_in', 'capital_out', 'supplier_payment'
);

create type currency_code as enum ('VES', 'USD');

create type invoice_type as enum ('invoice', 'credit_note');

-- Origen de la orden (SRS RF-09.6): la misma tabla `orders` sirve para
-- storefront, mostrador (staff con cliente presente) y pedidos tomados a
-- distancia (llamada/WhatsApp/etc.). No son módulos distintos, es el mismo
-- motor con distinta puerta de entrada.
create type order_channel as enum ('storefront', 'pos', 'phone');

-- ----------------------------------------------------------------------------
-- Helper genérico: updated_at automático
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 1. AUTENTICACIÓN Y PERFILES  (SRS RF-01)
-- ============================================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  avatar_url text,
  role user_role not null default 'cliente',
  branch_id uuid, -- reservado para multi-sede futuro, no usado en v1
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- Invitados sin cuenta (RF-15.2)
create table guest_customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  address text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Auditoría transversal (SRS 3.2 Transversal — Auditoría)
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,          -- 'insert' | 'update' | 'delete' | acción custom
  entity text not null,          -- nombre de la tabla/entidad
  entity_id uuid,
  diff jsonb,                    -- {before: {...}, after: {...}}
  created_at timestamptz not null default now()
);
create index idx_audit_log_entity on audit_log(entity, entity_id);
create index idx_audit_log_actor on audit_log(actor_id);

-- ============================================================================
-- 2. CATEGORÍAS  (SRS RF-02) — genérico producto / materia prima
-- ============================================================================

create table categories (
  id uuid primary key default gen_random_uuid(),
  applies_to category_target not null,
  name jsonb not null,          -- {"es": "Bebidas", "en": "Drinks"}
  description jsonb,
  sort_order int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_categories_updated before update on categories
  for each row execute function set_updated_at();
create index idx_categories_applies_to on categories(applies_to) where deleted_at is null;

-- ============================================================================
-- 3. UNIDADES DE MEDIDA  (SRS RF-03)
-- ============================================================================

create table units (
  id uuid primary key default gen_random_uuid(),
  name text not null,            -- 'Kilogramo', 'Litro', 'Unidad'
  abbreviation text not null,    -- 'kg', 'l', 'un'
  unit_type unit_type not null,
  conversion_factor numeric(14,6) not null default 1, -- respecto a unidad base de su tipo
  is_base_unit boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 4. PROVEEDORES  (SRS RF-06)
-- ============================================================================

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tax_id text,                   -- RIF
  contact_name text,
  phone text,
  email text,
  address text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_suppliers_updated before update on suppliers
  for each row execute function set_updated_at();

-- ============================================================================
-- 5. MATERIAS PRIMAS  (SRS RF-04)
-- ============================================================================

create table raw_materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references categories(id),
  unit_id uuid not null references units(id),
  min_stock numeric(14,3) not null default 0,
  average_cost numeric(14,4) not null default 0, -- costo promedio ponderado
  primary_supplier_id uuid references suppliers(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_raw_materials_updated before update on raw_materials
  for each row execute function set_updated_at();
create index idx_raw_materials_category on raw_materials(category_id) where deleted_at is null;

-- ============================================================================
-- 6. PRODUCTOS, RECETAS, ADICIONALES, COMBOS  (SRS RF-05)
-- ============================================================================

create table products (
  id uuid primary key default gen_random_uuid(),
  product_type product_type not null,
  category_id uuid references categories(id),
  name jsonb not null,
  description jsonb,
  price_ves numeric(14,2) not null,
  price_usd numeric(14,2) not null,
  image_url text,
  is_active boolean not null default true,
  is_sold_out boolean not null default false,
  -- solo relevante si product_type = 'retail': su propio stock se maneja
  -- vía inventory_movements con item_type = 'product', igual que raw_materials.
  min_stock numeric(14,3) not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_products_updated before update on products
  for each row execute function set_updated_at();
create index idx_products_category on products(category_id) where deleted_at is null;
create index idx_products_active on products(is_active) where deleted_at is null;

-- Receta (BOM) — solo aplica a product_type = 'prepared'
create table recipe_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  raw_material_id uuid not null references raw_materials(id),
  quantity numeric(14,4) not null,   -- en la unidad del raw_material
  created_at timestamptz not null default now(),
  unique (product_id, raw_material_id)
);

-- Adicionales / extras
create table product_extras (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,               -- {"es": "Bacon extra"}
  price_ves numeric(14,2) not null,
  price_usd numeric(14,2) not null,
  raw_material_id uuid references raw_materials(id), -- opcional, RF-05.4
  raw_material_quantity numeric(14,4),
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Relación producto <-> extras disponibles para ese producto
create table product_extra_options (
  product_id uuid not null references products(id) on delete cascade,
  extra_id uuid not null references product_extras(id) on delete cascade,
  primary key (product_id, extra_id)
);

-- Combos
create table combos (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  description jsonb,
  price_ves numeric(14,2) not null,
  price_usd numeric(14,2) not null,
  image_url text,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_combos_updated before update on combos
  for each row execute function set_updated_at();

create table combo_items (
  id uuid primary key default gen_random_uuid(),
  combo_id uuid not null references combos(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity int not null default 1
);

-- ============================================================================
-- 7. INVENTARIO — MOVIMIENTOS (Kardex)  (SRS RF-07)
-- ============================================================================

create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_type inventory_item_type not null,
  raw_material_id uuid references raw_materials(id),
  product_id uuid references products(id), -- solo si item_type = 'product' (retail)
  movement_type movement_type not null,
  quantity numeric(14,4) not null,          -- siempre positivo; el signo lo da movement_type
  unit_cost numeric(14,4),                  -- costo unitario al momento del movimiento (compras)
  supplier_id uuid references suppliers(id),
  order_id uuid,                            -- fk añadida más abajo (orders se crea después)
  performed_by uuid references profiles(id),
  note text,
  created_at timestamptz not null default now(),
  constraint chk_inventory_item check (
    (item_type = 'raw_material' and raw_material_id is not null and product_id is null) or
    (item_type = 'product' and product_id is not null and raw_material_id is null)
  )
);
create index idx_inv_mov_raw_material on inventory_movements(raw_material_id, created_at desc);
create index idx_inv_mov_product on inventory_movements(product_id, created_at desc);
create index idx_inv_mov_order on inventory_movements(order_id);

-- Vista de stock actual (derivado, NUNCA se edita directamente — SRS RF-04.2)
create view current_stock as
select
  'raw_material'::inventory_item_type as item_type,
  raw_material_id as item_id,
  coalesce(sum(
    case
      when movement_type in ('purchase_in','adjustment_in','transfer_in') then quantity
      when movement_type in ('sale_out','adjustment_out','waste','transfer_out') then -quantity
      else 0
    end
  ), 0) as stock
from inventory_movements
where raw_material_id is not null
group by raw_material_id
union all
select
  'product'::inventory_item_type as item_type,
  product_id as item_id,
  coalesce(sum(
    case
      when movement_type in ('purchase_in','adjustment_in','transfer_in') then quantity
      when movement_type in ('sale_out','adjustment_out','waste','transfer_out') then -quantity
      else 0
    end
  ), 0) as stock
from inventory_movements
where product_id is not null
group by product_id;

-- ============================================================================
-- 8. MESAS  (SRS RF-10)
-- ============================================================================

create table restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  name text not null,          -- 'Mesa 5'
  capacity int not null,
  zone text,
  status table_status not null default 'available',
  is_vip boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_tables_updated before update on restaurant_tables
  for each row execute function set_updated_at();

-- ============================================================================
-- 9. RESERVAS Y PAQUETES  (SRS RF-11)
-- ============================================================================

create table reservation_packages (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  description jsonb,
  price_ves numeric(14,2) not null,
  price_usd numeric(14,2) not null,
  capacity int not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_res_packages_updated before update on reservation_packages
  for each row execute function set_updated_at();

create table reservation_package_tables (
  package_id uuid not null references reservation_packages(id) on delete cascade,
  table_id uuid not null references restaurant_tables(id) on delete cascade,
  primary key (package_id, table_id)
);

create table reservations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  guest_customer_id uuid references guest_customers(id),
  table_id uuid references restaurant_tables(id),
  package_id uuid references reservation_packages(id),
  party_size int not null,
  reserved_at timestamptz not null,       -- fecha/hora de la reserva
  duration_minutes int not null default 90,
  status reservation_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_reservation_customer check (
    (profile_id is not null) or (guest_customer_id is not null)
  )
);
create trigger trg_reservations_updated before update on reservations
  for each row execute function set_updated_at();
create index idx_reservations_table_time on reservations(table_id, reserved_at);

-- RB-05: sin solapamiento de reservas confirmadas en la misma mesa.
-- Se aplica con exclusion constraint usando rango de tiempo.
-- 1. Creamos una función auxiliar explícitamente inmutable
create or replace function calc_reserved_range(r_at timestamptz, d_mins int)
returns tstzrange language sql immutable as $$
  select tstzrange(r_at, r_at + (d_mins * interval '1 minute'));
$$;

-- 2. Usamos la función inmutable en la columna generada
alter table reservations add column reserved_range tstzrange
  generated always as (calc_reserved_range(reserved_at, duration_minutes)) stored;

create extension if not exists btree_gist;
alter table reservations add constraint excl_reservation_overlap
  exclude using gist (
    table_id with =,
    reserved_range with &&
  ) where (status in ('pending', 'confirmed', 'seated') and table_id is not null);

-- ============================================================================
-- 10. MÉTODOS DE PAGO  (SRS RF-14)
-- ============================================================================

create table payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,           -- 'Efectivo USD', 'Pago Móvil', 'Cashea'
  currency currency_code not null,
  provider_code text,           -- adaptador genérico para integraciones futuras
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 11. ÓRDENES  (SRS RF-09) — unifica pedidos + cocina + delivery
-- ============================================================================

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity,
  profile_id uuid references profiles(id),
  guest_customer_id uuid references guest_customers(id),
  fulfillment_type fulfillment_type not null,
  table_id uuid references restaurant_tables(id),      -- solo dine_in
  delivery_address text,                                -- solo delivery
  delivery_profile_id uuid references profiles(id),     -- repartidor asignado (rol delivery)
  status order_status not null default 'pending',
  currency currency_code not null default 'VES',
  exchange_rate numeric(14,4) not null,   -- snapshot VES/USD al momento de crear la orden (RB-04)
  subtotal_ves numeric(14,2) not null default 0,
  subtotal_usd numeric(14,2) not null default 0,
  total_ves numeric(14,2) not null default 0,
  total_usd numeric(14,2) not null default 0,
  payment_method_id uuid references payment_methods(id),
  cash_session_id uuid, -- fk añadida tras crear cash_sessions
  channel order_channel not null default 'storefront', -- RF-09.6
  taken_by uuid references profiles(id),   -- staff que la registró (null si channel = storefront)
  client_ref uuid,       -- id generado en el dispositivo para sync offline idempotente (RB-07)
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_order_customer check (
    (profile_id is not null) or (guest_customer_id is not null)
  ),
  constraint chk_order_table check (
    fulfillment_type <> 'dine_in' or table_id is not null
  ),
  constraint chk_order_taken_by check (
    channel = 'storefront' or taken_by is not null
  )
);
-- RB-07: idempotencia de sincronización offline — un client_ref no se
-- duplica nunca (varios NULL sí se permiten, es el caso normal storefront).
create unique index uq_orders_client_ref on orders(client_ref) where client_ref is not null;
create trigger trg_orders_updated before update on orders
  for each row execute function set_updated_at();
create index idx_orders_status on orders(status);
create index idx_orders_fulfillment on orders(fulfillment_type, status);
create index idx_orders_created on orders(created_at desc);

alter table inventory_movements
  add constraint fk_inv_mov_order foreign key (order_id) references orders(id);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  combo_id uuid references combos(id),
  quantity int not null default 1,
  unit_price_ves numeric(14,2) not null,
  unit_price_usd numeric(14,2) not null,
  notes text,
  constraint chk_order_item_ref check (
    (product_id is not null) or (combo_id is not null)
  )
);

create table order_item_extras (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_items(id) on delete cascade,
  extra_id uuid not null references product_extras(id),
  quantity int not null default 1,
  unit_price_ves numeric(14,2) not null,
  unit_price_usd numeric(14,2) not null
);

-- RB-02: historial de la máquina de estados
create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  from_status order_status,
  to_status order_status not null,
  changed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_order_status_history_order on order_status_history(order_id, created_at);

-- ============================================================================
-- 12. CAJA Y FINANZAS  (SRS RF-12)
-- ============================================================================

create table cash_sessions (
  id uuid primary key default gen_random_uuid(),
  opened_by uuid not null references profiles(id),
  closed_by uuid references profiles(id),
  opening_amount_ves numeric(14,2) not null default 0,
  opening_amount_usd numeric(14,2) not null default 0,
  expected_amount_ves numeric(14,2),
  expected_amount_usd numeric(14,2),
  counted_amount_ves numeric(14,2),
  counted_amount_usd numeric(14,2),
  is_open boolean not null default true,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);
-- RB-03: solo una sesión abierta a la vez
create unique index uq_one_open_cash_session on cash_sessions (is_open) where is_open;

alter table orders
  add constraint fk_orders_cash_session foreign key (cash_session_id) references cash_sessions(id);

create table financial_transactions (
  id uuid primary key default gen_random_uuid(),
  txn_type financial_txn_type not null,
  cash_session_id uuid references cash_sessions(id), -- null permitido: capital_in/out no siempre dependen de una sesión
  order_id uuid references orders(id),                -- solo si txn_type = 'sale'
  supplier_id uuid references suppliers(id),           -- solo si txn_type = 'supplier_payment'
  currency currency_code not null,
  amount numeric(14,2) not null,
  exchange_rate numeric(14,4) not null,
  description text,
  performed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_fin_txn_session on financial_transactions(cash_session_id);
create index idx_fin_txn_type_date on financial_transactions(txn_type, created_at desc);

-- ============================================================================
-- 13. FACTURACIÓN  (SRS RF-13)
-- ============================================================================

create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number bigint generated always as identity,
  order_id uuid not null references orders(id),
  type invoice_type not null default 'invoice',
  reference_invoice_id uuid references invoices(id), -- si type = credit_note
  currency currency_code not null,
  exchange_rate numeric(14,4) not null,
  subtotal numeric(14,2) not null,
  tax_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null,
  customer_tax_id text,      -- RIF/cédula del cliente si lo provee
  items_snapshot jsonb not null, -- copia inmutable de order_items al momento de facturar
  issued_at timestamptz not null default now()
);
create index idx_invoices_order on invoices(order_id);

-- ============================================================================
-- ROW LEVEL SECURITY — plantilla base
-- (cada fase de implementación afina las políticas exactas; aquí se deja
--  el patrón estándar a seguir, ver AGENTS.md / docs/FASES_PROMPTS.md)
-- ============================================================================

alter table profiles enable row level security;
alter table products enable row level security;
alter table categories enable row level security;
alter table raw_materials enable row level security;
alter table inventory_movements enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_item_extras enable row level security;
alter table order_status_history enable row level security;
alter table reservations enable row level security;
alter table restaurant_tables enable row level security;
alter table cash_sessions enable row level security;
alter table financial_transactions enable row level security;
alter table invoices enable row level security;
alter table suppliers enable row level security;
alter table guest_customers enable row level security;
alter table audit_log enable row level security;

-- Helper: rol del usuario autenticado actual
-- SECURITY DEFINER es obligatorio para romper la recursión infinita de RLS:
-- SELECT profiles → evalúa RLS → llama auth_role() → SELECT profiles → loop
create or replace function auth_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

-- Ejemplo de política (patrón a replicar en cada fase para cada tabla):
-- Lectura pública del catálogo activo (para el storefront):
create policy "catalogo_publico_lectura" on products
  for select using (is_active = true and deleted_at is null);

-- Escritura solo para staff con permiso sobre catálogo:
create policy "catalogo_staff_escritura" on products
  for all using (auth_role() in ('owner','admin'))
  with check (auth_role() in ('owner','admin'));

-- Un cliente solo ve sus propias órdenes; el staff operativo ve todas:
create policy "ordenes_propias_o_staff" on orders
  for select using (
    profile_id = auth.uid()
    or auth_role() in ('owner','admin','cajero','mesero','cocina','delivery')
  );

-- (El resto de políticas específicas por rol/tabla se definen fase por fase,
--  siguiendo este mismo patrón: lectura amplia cuando es catálogo público,
--  lectura/escritura restringida por auth_role() para todo lo operativo.)

-- ============================================================================
-- FIN DEL ESQUEMA v2.0
-- ============================================================================
