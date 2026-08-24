-- ============================================================================
-- FASE 5 — Tienda en línea pública (SRS RF-08)
-- Políticas RLS públicas y sembrado de métodos de pago base
-- ============================================================================

-- ----------------------------------------------------------------------------
-- RLS público para el catálogo de la tienda en línea
-- ----------------------------------------------------------------------------

-- Categorías de producto visibles públicamente (solo para products, no eliminadas)
create policy "categorias_publico_lectura" on categories
  for select using (applies_to = 'product' and deleted_at is null);

-- Combos activos visibles públicamente
create policy "combos_publico_lectura" on combos
  for select using (is_active = true and deleted_at is null);

-- Adicionales visibles públicamente (no eliminados)
create policy "extras_publico_lectura" on product_extras
  for select using (deleted_at is null);

-- Relaciones producto-extra visibles públicamente
create policy "producto_extras_publico_lectura" on product_extra_options
  for select using (true);

-- Mesas: el storefront solo necesita ver el estado de las mesas disponibles
create policy "mesas_publico_lectura" on restaurant_tables
  for select using (deleted_at is null);

-- Métodos de pago: solo los activos son visibles públicamente
create policy "metodos_pago_publico_lectura" on payment_methods
  for select using (is_active = true and deleted_at is null);

-- Invitados: permitir inserción pública para crear guest_customers durante checkout
-- (la orden real se crea en la Fase 6; aquí solo se captura el dato)
create policy "invitados_insercion" on guest_customers
  for insert with check (true);

-- ----------------------------------------------------------------------------
-- Seed: métodos de pago base
-- TODO(fase-metodos-pago): reemplazar con CRUD real de payment_methods
-- (Fase 8 según FASES_PROMPTS.md)
-- ----------------------------------------------------------------------------
insert into payment_methods (name, currency, provider_code, is_active) values
  ('Efectivo VES', 'VES', NULL, true),
  ('Efectivo USD', 'USD', NULL, true),
  ('Pago Móvil', 'VES', 'pago_movil', true)
on conflict do nothing;
