-- ============================================================================
-- BURGER HOUSE — Fix RLS catálogo (fase productos/combos/extras)
-- Ejecutar en el SQL Editor de Supabase.
--
-- Contexto: recipe_items (y otras tablas del catálogo) tienen RLS habilitado
-- pero sin políticas, por lo que todo insert/select falla con:
--   "new row violates row-level security policy for table recipe_items"
--
-- Este script es idempotente: puede ejecutarse varias veces sin error.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Asegurar RLS habilitado en las tablas del catálogo
-- ----------------------------------------------------------------------------
alter table public.recipe_items enable row level security;
alter table public.combo_items enable row level security;
alter table public.product_extra_options enable row level security;
alter table public.product_extras enable row level security;
alter table public.combos enable row level security;
alter table public.units enable row level security;

-- ----------------------------------------------------------------------------
-- 2. recipe_items — recetas de productos preparados
--    SELECT: staff operativo (getProduct hace join embebido y lo usan
--    también cajero/mesero/cocina). Escritura: owner/admin.
-- ----------------------------------------------------------------------------
drop policy if exists "recipe_items_select_staff" on public.recipe_items;
create policy "recipe_items_select_staff"
  on public.recipe_items
  for select
  to authenticated
  using (auth_role() in ('owner', 'admin', 'cajero', 'mesero', 'cocina'));

drop policy if exists "recipe_items_write_admin" on public.recipe_items;
create policy "recipe_items_write_admin"
  on public.recipe_items
  for all
  to authenticated
  using (auth_role() in ('owner', 'admin'))
  with check (auth_role() in ('owner', 'admin'));

-- ----------------------------------------------------------------------------
-- 3. combo_items — productos dentro de combos
-- ----------------------------------------------------------------------------
drop policy if exists "combo_items_select_staff" on public.combo_items;
create policy "combo_items_select_staff"
  on public.combo_items
  for select
  to authenticated
  using (auth_role() in ('owner', 'admin', 'cajero', 'mesero', 'cocina'));

drop policy if exists "combo_items_write_admin" on public.combo_items;
create policy "combo_items_write_admin"
  on public.combo_items
  for all
  to authenticated
  using (auth_role() in ('owner', 'admin'))
  with check (auth_role() in ('owner', 'admin'));

-- ----------------------------------------------------------------------------
-- 4. product_extra_options — relación producto <-> adicional
-- ----------------------------------------------------------------------------
drop policy if exists "extra_options_select_staff" on public.product_extra_options;
create policy "extra_options_select_staff"
  on public.product_extra_options
  for select
  to authenticated
  using (auth_role() in ('owner', 'admin', 'cajero', 'mesero', 'cocina'));

drop policy if exists "extra_options_write_admin" on public.product_extra_options;
create policy "extra_options_write_admin"
  on public.product_extra_options
  for all
  to authenticated
  using (auth_role() in ('owner', 'admin'))
  with check (auth_role() in ('owner', 'admin'));

-- ----------------------------------------------------------------------------
-- 5. product_extras — catálogo de adicionales
--    Lectura pública del catálogo vigente (storefront), escritura owner/admin.
-- ----------------------------------------------------------------------------
drop policy if exists "extras_public_read" on public.product_extras;
create policy "extras_public_read"
  on public.product_extras
  for select
  to anon, authenticated
  using (deleted_at is null);

drop policy if exists "extras_write_admin" on public.product_extras;
create policy "extras_write_admin"
  on public.product_extras
  for all
  to authenticated
  using (auth_role() in ('owner', 'admin'))
  with check (auth_role() in ('owner', 'admin'));

-- ----------------------------------------------------------------------------
-- 6. combos — catálogo de combos
--    Lectura pública solo si activo y no eliminado; escritura owner/admin.
-- ----------------------------------------------------------------------------
drop policy if exists "combos_public_read" on public.combos;
create policy "combos_public_read"
  on public.combos
  for select
  to anon, authenticated
  using (is_active = true and deleted_at is null);

drop policy if exists "combos_write_admin" on public.combos;
create policy "combos_write_admin"
  on public.combos
  for all
  to authenticated
  using (auth_role() in ('owner', 'admin'))
  with check (auth_role() in ('owner', 'admin'));

-- ----------------------------------------------------------------------------
-- 7. units — unidades de medida (catálogo de solo lectura para clientes)
-- ----------------------------------------------------------------------------
drop policy if exists "units_public_read" on public.units;
create policy "units_public_read"
  on public.units
  for select
  to anon, authenticated
  using (deleted_at is null);

drop policy if exists "units_write_admin" on public.units;
create policy "units_write_admin"
  on public.units
  for all
  to authenticated
  using (auth_role() in ('owner', 'admin'))
  with check (auth_role() in ('owner', 'admin'));

-- ============================================================================
-- 8. STORAGE — bucket único público para imágenes del catálogo
--    Estructura de carpetas: products/, combos/
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Lectura pública de las imágenes
drop policy if exists "product_images_read" on storage.objects;
create policy "product_images_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'product-images');

-- Subida solo para owner/admin autenticados
drop policy if exists "product_images_upload" on storage.objects;
create policy "product_images_upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and auth_role() in ('owner', 'admin')
  );

-- Reemplazo de imagen (mismo nombre de archivo)
drop policy if exists "product_images_update" on storage.objects;
create policy "product_images_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and auth_role() in ('owner', 'admin')
  )
  with check (
    bucket_id = 'product-images'
    and auth_role() in ('owner', 'admin')
  );

-- Eliminación de imagen (al quitarla del formulario / borrar el registro)
drop policy if exists "product_images_delete" on storage.objects;
create policy "product_images_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and auth_role() in ('owner', 'admin')
  );
