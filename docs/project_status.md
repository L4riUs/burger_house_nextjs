# Burger House — Estado del Proyecto

**Última actualización:** 7 de septiembre de 2026  
**Fase actual:** Fase 11 (Pulido, rendimiento y caché) — Pendiente  
**Fases completadas:** 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10  
**Fases pendientes:** 11

---

## Resumen de Fases Completadas

| Fase | Estado | Descripción |
|------|--------|-------------|
| **Fase 0** | ✅ **Completada** | Bootstrap: Next.js 16 (App Router, JS), Tailwind v4, shadcn/ui, Zustand, Zod, React Hook Form, nextjs-toploader, next-themes, Supabase client/server/admin, Vitest, estructura de carpetas |
| **Fase 1** | ✅ **Completada** | Auth, Perfiles y Roles: Registro/login/reset password, creación automática de profiles, middleware por rol, página de perfil (subida avatar), gestión de usuarios admin con dual-view/paginación, políticas RLS, audit_log en cambios de rol, tests unitarios esquemas Zod y lógica de asignación de roles |
| **Fase 2** | ✅ **Completada** | Catálogo base: Categorías (reutilizable para product/raw_material con JSONB i18n), Unidades (conversión, soft-delete), Materias Primas (stock no editable, primary_supplier_id con TODO fase 3), Papelera genérica (3 entidades), dual-view/paginación/filtros en todo, tests unitarios Zod + conversión de unidades |
| **Fase 3** | ✅ **Completada** | Proveedores e Inventario: CRUD suppliers, completado primary_supplier_id en raw_materials, Movimientos de inventario (kardex con vista current_stock), alertas stock bajo (badge + widget reutilizable), RLS por rol, tests unitarios lógica de signo de movimiento |
| **Fase 4** | ✅ **Completada** | Productos, Recetas, Adicionales y Combos: Products (prepared/retail con campos condicionales), RecipeEditor (validación duplicados), Product Extras (raw_material_id opcional), Combos, imágenes en Supabase Storage, papelera extendida, tests unitarios receta/combo/precio |
| **Fase 5** | ✅ **Completada** | Tienda pública: Catálogo (server components, is_active), Carrito Zustand persistido (lib/storage.js), Checkout wizard (fulfillment, guest/auth, payment methods seed con TODO fase 8), createOrderDraft server action (stub para fase 6), tests unitarios cart store + checkout Zod |
| **Fase 6** | ✅ **Completada** | Órdenes unificadas (Pedidos/Cocina/Delivery): createOrder real (conecta checkout + POS interno), State machine pura (features/orders/state-machine.js) con RB-02, RB-01 descuento inventario transaccional al confirmar (recipe_items, retail, extras), order_status_history, Panel Órdenes staff (dual-view/filtros/acciones por estado), Cocina (Realtime kanban), Delivery (tomar entrega con concurrencia WHERE delivery_profile_id IS NULL, marcar entregado), Seguimiento cliente (Realtime), POS interno (reusa createOrder, channel pos/phone, taken_by, búsqueda productos/guest), Tests unitarios exhaustivos: state machine, inventory deduction, idempotency, delivery concurrency, POS order creation |
| **Fase 7** | ✅ **Completada** | Mesas, Reservas y Paquetes: restaurant_tables CRUD + vista mapa/tabla/tarjetas, migración SQL con trigger sync de estado de mesa (occupied/available) + RLS, reservation_packages CRUD (i18n JSONB, price VES vía BCV), reservations CRUD con manejo de exclusion constraint `excl_reservation_overlap` (error amigable), sentar/cancelar reserva, tests unitarios (overlap error + helpers). Registro de auditoría de la fase pendiente para Fase 10 |
| **Fase 8** | ✅ **Completada** | Caja y Finanzas: payment_methods CRUD real (activo/inactivo), cash_sessions apertura/cierre con arqueo (expected vs counted en VES y USD, RB-03) + historial de cierres paginado, financial_transactions (sale/expense/capital_in/out/supplier_payment) con registro de movimiento, reporte capital (capital_in − capital_out), facturación automática al confirmar pago + listado facturas con detalle y notas de crédito (RB-04, RB-06), snapshot moneda y exchange_rate conforme RB-04. Lógica como funciones puras (`core.js`, `helpers.js`) + 14 tests (cash-close, financial-txn, invoice-credit). **Pendiente:** aplicar `docs/fix_rls_caja_phase8.sql` (RLS) en Supabase |
| **Fase 9** | ✅ **Completada** | Modo offline POS: lib/offline-queue.js (IndexedDB via idb), detección online/offline (navigator.onLine + listeners), cola pedidos con client_ref/estado/timestamp, sincronización automática al reconectar + botón manual, idempotencia server-side por client_ref (RB-07), pantalla pendientes/conflictos (editar/reintentar/descartar), pedidos offline NO aparecen en panel general/cocina/delivery/caja hasta sincronizar, tests unitarios cola + idempotency + flujo completo |
| **Fase 10** | ✅ **Completada** | Dashboard, Reportes y Auditoría: KPIs agregados vía RPC Supabase (ventas totales VES/USD, órdenes por estado, top productos/combos, ticket promedio, estado caja, alertas stock bajo reusando widget Fase 3), exportación CSV reusando mismas consultas del dashboard (ventas, inventario, caja/finanzas), pantalla auditoría owner/admin (filtros entidad/actor/acción/fecha, paginación, detalle diff JSON), triggers auditoría completados para Fases 7 y 8 (restaurant_tables, reservations, reservation_packages, cash_sessions, financial_transactions, invoices, payment_methods, orders status_change, inventory_movements), 14 tests unitarios agregación dashboard |
| **Fase 11** | ⏳ **Pendiente** | Pulido y rendimiento: revisión RNF (caché catálogo, Zustand único, paginación, Realtime), auditoría RLS completa, validación Zod cliente+server, estructura por feature, inventario tests lógica crítica, performance queries + índices, validación alcance offline Fase 9 |

---

## Decisiones Técnicas Clave y Arquitectura

### Stack Confirmado (según AGENTS.md)
- **Next.js 16** (App Router, solo JavaScript — nada de .ts/.tsx)
- **Supabase**: Postgres + Auth + Storage + Realtime (RLS habilitado)
- **Zustand**: Estado global de cliente (carrito, sesión UI, filtros) — un store por feature
- **Zod**: Validación de TODOS los datos entrantes (formularios + server actions)
- **React Hook Form** + `zodResolver`: Obligatorio en TODOS los formularios
- **shadcn/ui**: Librería base de componentes
- **nextjs-toploader**: Feedback de transición de página
- **next-themes**: Modo claro/oscuro
- **Tailwind CSS v4**: Estilos
- **Vitest**: Tests unitarios
- **idb**: Wrapper IndexedDB para cola offline

### Estructura de Carpetas (Por Feature)
```
app/
  (auth)/          # Login, register, reset, forgot password
  (store)/         # Tienda pública (menu, cart, checkout)
  admin/           # Panel admin (users, inventory, products, orders, caja, POS, offline-queue)
  api/             # Route handlers (debug, suppliers check-usage)
  rastreo/[orderNumber]/  # Seguimiento de órdenes para clientes
  cocina/          # Vista cocina
  delivery/        # Vista delivery
features/
  categories/      # Categorías (reusable applies_to)
  units/           # Unidades de medida
  raw-materials/   # Materias primas
  suppliers/       # Proveedores
  inventario/      # Movimientos, Kardex, StockAlertWidget
  caja/            # Caja y finanzas (core, helpers, actions, schemas)
  products/        # Productos, RecipeEditor
  combos/          # Combos
  product-extras/  # Adicionales
  checkout/        # Checkout wizard, schemas
  orders/          # Panel órdenes, state-machine, inventory-deduction, POS, tracking
  kitchen/         # Kitchen kanban (Realtime)
  delivery/        # Delivery list
  profile/         # Perfil de usuario
  trash/           # Papelera genérica
  catalog/         # Acciones catálogo público
lib/
  supabase/        # client.js, server.js, admin.js, middleware.js
  storage.js       # localStorage centralizado (persistencia carrito)
  offline-queue.js # Cola IndexedDB (idb) para POS offline
  unit-conversion.js # Lógica pura de conversión (testeada)
  i18n.js          # Helper getLocalizedField para JSONB
  config.js        # Constantes app (ALLOW_NEGATIVE_STOCK, etc.)
  bcv.js           # Tasa de cambio BCV (stub)
components/
  ui/              # Componentes shadcn/ui
  shared/          # Reutilizables (image-upload-field)
  nav-*            # Componentes de navegación
```

### Ubicaciones de Lógica de Negocio Crítica (Funciones Puras, Testeadas)
| Lógica | Ubicación | Tests |
|--------|-----------|-------|
| Máquina de estados (RB-02) | `features/orders/state-machine.js` | `features/orders/__tests__/state-machine.test.js` |
| Descuento inventario (RB-01) | `features/orders/inventory-deduction.js` | `features/orders/__tests__/inventory-deduction.test.js` |
| Conversión de unidades | `lib/unit-conversion.js` | `lib/__tests__/unit-conversion.test.js` |
| Cola offline POS | `lib/offline-queue.js` | `lib/__tests__/offline-queue.test.js` |
| Idempotencia createOrder | `features/orders/actions.js` | `features/orders/__tests__/idempotency.test.js` |
| Concurrencia delivery | `features/orders/actions.js` | `features/orders/__tests__/assign-delivery-concurrency.test.js` |
| Creación orden POS | `features/orders/pos/store.js` + actions | `features/orders/__tests__/pos-order-creation.test.js` |
| Cierre de caja (arqueo) | `features/caja/core.js` | `features/caja/__tests__/cash-close.test.js` |
| Transacciones financieras | `features/caja/core.js` + `helpers.js` | `features/caja/__tests__/financial-txn.test.js` |
| Facturación / notas de crédito | `features/caja/core.js` + `helpers.js` | `features/caja/__tests__/invoice-credit.test.js` |

### Implementaciones Realtime
- **Cocina** (`features/kitchen/components/KitchenKanban.jsx`): Suscribe a cambios en `orders` (confirmed/in_kitchen), actualiza columnas kanban sin polling
- **Delivery** (`features/delivery/components/DeliveryList.jsx`): Suscribe a `orders` (ready + fulfillment_type=delivery), maneja "tomar entrega" con actualización optimista + confirmación servidor
- **Seguimiento Orden** (`features/orders/tracking/page.jsx`): Actualizaciones realtime de estado para cliente

### Base UI: patrón `render` (shadcn `base`), no `asChild`
- Los componentes shadcn del repo usan **Base UI**; `asChild` es API de Radix y **se ignora**, provocando DOM inválido (ej. `<button>` anidado en triggers de menús/popovers → hydration error).
- Regla del proyecto: usar `render={<Elemento/>}` en triggers y composición (fuente: `.agents/skills/shadcn/rules/base-vs-radix.md`). Corregido en: `table-row-actions.jsx`, `OrderStatusActions.jsx`, `OrderCards.jsx`, `PosOrderBuilder.jsx`, `nav-user.jsx`.
- Cuando `render` convierte el trigger en elemento no-botón (`<a>`, `<span>`), añadir `nativeButton={false}`.

### Paginación compartida funcional
- Los primitivos `components/ui/pagination.jsx` (Base UI) **ignoran** `currentPage`/`totalPages`/`onPageChange`, así que la paginación de varias páginas nunca se renderizó.
- Se creó `components/shared/pagination-control.jsx` (usa `MenuClient`/primitivos) y se migraron: caja (sesion, movimientos, facturas), orders y movimientos/kardex de inventario.

### Arquitectura Offline (Fase 9)
- **Cola**: `lib/offline-queue.js` usando `idb` (IndexedDB) — guarda payload completo + `client_ref` (UUID) + estado local (`pending_sync`/`synced`/`conflict`)
- **Detección**: `navigator.onLine` + listeners `online`/`offline` (sin Service Worker / Background Sync según SRS RNF-12)
- **Sincronización**: Al evento `online`, vacía cola secuencialmente llamando `createOrder` compartido con `client_ref`
- **Idempotencia**: Server action verifica unicidad de `client_ref` antes de insertar (RB-07)
- **Manejo conflictos**: Errores servidor (ej. producto desactivado) marcan item como `conflict`; UI permite editar/reintentar/descartar
- **Visibilidad**: Órdenes offline solo en "Pedidos pendientes" (`/admin/offline-queue`), NO en panel principal Órdenes/Cocina/Delivery/Caja hasta sincronizar

---

## Checklist de Verificación Manual (Lo que funciona hoy)

### Auth y Roles (Fase 1)
- [ ] Registrar usuario nuevo → crea profile automático con role='cliente'
- [ ] Login → redirige: cliente → store, admin/owner/cocina/delivery/cajero → /admin
- [ ] Recuperar contraseña → flujo reset funciona
- [ ] Página perfil: editar nombre, teléfono, subir avatar (Supabase Storage), cambiar password
- [ ] Admin users: dual-view, paginación, filtro por rol, cambiar rol (AlertDialog), entry audit_log creada
- [ ] RLS: cliente no puede leer perfil de otro usuario (verificar con query directa Supabase)

### Catálogo Base (Fase 2)
- [ ] Categorías: un solo componente maneja `applies_to='product'` y `'raw_material'`, JSONB name/description, helper i18n
- [ ] Unidades: CRUD con conversion_factor, soft-delete con advertencia si en uso
- [ ] Materias Primas: campo stock muestra "Stock: se gestiona en el módulo de Inventario" (no editable), selector primary_supplier_id (poblado desde Fase 3)
- [ ] Papelera: muestra eliminados de las 3 entidades, restaurar funciona

### Proveedores e Inventario (Fase 3)
- [ ] Suppliers CRUD con dual-view/paginación/filtros
- [ ] Movimientos inventario: crear compra (type=raw_material, movement_type=purchase_in) → stock sube en Kardex
- [ ] Kardex: filtrar por rango fecha + tipo movimiento, muestra saldo acumulado desde vista `current_stock`
- [ ] Badge alerta stock en lista raw materials cuando `current_stock < min_stock`
- [ ] StockAlertWidget componente reutilizable existe

### Productos, Recetas, Extras, Combos (Fase 4)
- [ ] Producto 'prepared': requiere al menos 1 recipe_item (validado), RecipeEditor previene raw_material duplicado
- [ ] Producto 'retail': stock informativo, habilita selector producto en movimientos inventario
- [ ] Product Extras: raw_material_id + quantity opcional (para descuento inventario futuro)
- [ ] Combos: al menos 1 producto requerido, cálculo precio muestra ahorro
- [ ] Imágenes suben a Supabase Storage (no base64)

### Storefront (Fase 5)
- [ ] Menú público: solo productos activos, filtro categoría, búsqueda
- [ ] Carrito: persiste al recargar (Zustand + lib/storage.js), soporta productos con extras, combos, cantidad
- [ ] Checkout: 3 pasos (fulfillment → contacto → pago), flujo guest + autenticado
- [ ] Métodos de pago: 2-3 sembrados en BD (TODO: CRUD real Fase 8)

### Órdenes Unificadas (Fase 6)
- [ ] Checkout → createOrder crea order + items + extras, status='pending'
- [ ] State machine: pending→confirmed→in_kitchen→ready→(out_for_delivery|served)→completed; any→cancelled
- [ ] Confirmar orden (pending→confirmed): descuento inventario transaccional (recipe_items × qty, retail, extras con raw_material_id), todos movimientos llevan `order_id`
- [ ] Historial estados orden registrado en cada transición
- [ ] Panel órdenes: dual-view, filtros (status, fulfillment), botones acción por transición válida
- [ ] Cocina: realtime kanban (confirmed/in_kitchen), botones avanzar, acceso rol 'cocina'
- [ ] Delivery: realtime lista (ready + delivery), "Tomar entrega" con protección concurrencia, "Marcar entregado" → completed, acceso rol 'delivery'
- [ ] Seguimiento cliente: página realtime por número de orden
- [ ] POS Interno (Nueva Orden): reusa createOrder, búsqueda productos, channel pos/phone, guest customer buscar/crear, taken_by=usuario actual

### POS Offline (Fase 9)
- [ ] Desconectar red (DevTools → Offline) → crear orden POS → muestra "Pedido guardado, se sincronizará..."
- [ ] Contador pendientes visible en navbar Órdenes
- [ ] Reconectar → auto-sync → orden aparece en panel Órdenes principal, Cocina, Delivery
- [ ] Intento sync duplicado (mismo client_ref) → NO crea orden duplicada
- [ ] Test conflicto: desactivar producto en orden offline → reconectar → item marcado 'conflict' → UI permite editar/reintentar/descartar

### Caja y Finanzas (Fase 8)
- [ ] Métodos de pago: CRUD real (crear/editar/activar-desactivar), aplica a checkout
- [ ] Apertura de caja: crear cash_session con monto inicial
- [ ] Registrar movimiento (expense/capital_in/capital_out/supplier_payment): válida sesión y proveedor opcional, aparece en movimientos
- [ ] Cierre de caja: arqueo expected vs counted por efectivo (VES y USD), diferencia calculada, bloquea cobros efectivo sin sesión abierta (RB-03)
- [ ] Historial de cierres en Sesión: tabla paginada (fecha, esperado/contado/diferencia, quien abrió/cerró)
- [ ] Facturación: confirmar pago genera factura; lista de facturas con "Ver factura" (detalle con cliente/perfil embebidos correctamente)
- [ ] Nota de crédito: generar desde factura (RB-04, RB-06)
- [ ] Reporte Capital: muestra capital_in − capital_out con snapshot moneda/tasa (RB-04)

### Dashboard, Reportes y Auditoría (Fase 10)
- [ ] Dashboard: KPIs cargan en <2s con rango 30 días (agregación en BD vía RPC)
- [ ] Ventas totales VES/USD, órdenes por estado, top 10 productos, top 5 combos, ticket promedio
- [ ] Estado de caja: muestra sesión abierta/cerrada, arqueo tiempo real, diferencia
- [ ] Alertas stock bajo: reutiliza StockAlertWidget Fase 3, muestra materias primas y productos retail
- [ ] Filtros fecha: presets (hoy, ayer, 7d, 30d, mes actual, mes anterior, personalizado)
- [ ] Exportar CSV: Ventas / Inventario / Caja → mismos números que en pantalla
- [ ] Auditoría: lista paginada, filtros entidad/actor/acción/fecha, detalle diff JSON
- [ ] Triggers auditoría: Fases 7 y 8 cubiertas (mesas, reservas, paquetes, caja, finanzas, facturas, métodos pago, órdenes, inventario)

---

## TODOs / Stubs Conocidos para Fases Futuras

| Ubicación | TODO | Fase Objetivo |
|-----------|------|---------------|
| `features/raw-materials/components/RawMaterialForm.jsx` | Selector `primary_supplier_id` (completado Fase 3) | — |
| `features/inventario/components/MovementForm.jsx` | Selector producto retail (completado Fase 4) | — |
| `features/checkout/actions.js` | Stub `createOrderDraft` → reemplazado por `createOrder` real Fase 6 | — |
| `features/checkout/schemas.js` | Payment methods sembrados → CRUD real completado Fase 8 | — |
| `lib/config.js` | Constante `ALLOW_NEGATIVE_STOCK` (bloqueo/advertencia configurable) | Fase 6 (hecho) |
| `lib/bcv.js` | Integración tasa de cambio (stub; caja usa snapshot conservado) | Fase 10/11 |
| `features/orders/actions.js` | Check idempotencia `client_ref` (implementado Fase 9) | — |
| `app/admin/page.jsx` | Dashboard KPIs (stub) | Fase 10 |
| `docs/fix_rls_caja_phase8.sql` | Aplicar en Supabase para habilitar RLS de caja (payment_methods, cash_sessions, financial_transactions, invoices/credit_notes) | Fase 8 (DB) |
| `features/inventario/actions.js` | `listInventoryMovements` sin soporte `search` → el buscador de MovementFilters no está conectado | Pendiente |
| `features/caja/core.js` | Decidir si ventas cobradas suman al balance de Capital (hoy solo `capital_in − capital_out`) | Pendiente |
| Suites `offline-queue`, `assign-delivery-concurrency`, `idempotency`, `inventory-deduction` | 4 suites de tests rotas preexistentes por refactor de imports/mocks (verificar y reparar) | Pendiente |
| `lib/bcv.js` | Integración tasa de cambio BCV (stub; caja usa snapshot conservado) | Fase 11 |
| `jspdf` / `jspdf-autotable` | Instalar para exportación PDF real de reportes | Fase 11 |

---

## Resumen de Cobertura de Tests

Ejecutar: `npm test`

| Archivo Test | Cobertura |
|--------------|-----------|
| `lib/__tests__/sanity.test.js` | Sanity check Vitest runner |
| `lib/__tests__/unit-conversion.test.js` | 3+ casos: misma unidad, conversión válida, error cross-unit_type |
| `lib/__tests__/offline-queue.test.js` | Ops cola, idempotencia, flujo sync completo |
| `features/categories/__tests__/schemas.test.js` | Validación Zod |
| `features/units/__tests__/schemas.test.js` | Validación Zod |
| `features/raw-materials/__tests__/schemas.test.js` | Validación Zod |
| `features/suppliers/__tests__/schemas.test.js` | Validación Zod |
| `features/products/__tests__/schemas.test.js` | Validación Zod (receta, combo, producto) |
| `features/combos/__tests__/schemas.test.js` | Validación Zod |
| `features/product-extras/__tests__/schemas.test.js` | Validación Zod |
| `features/checkout/__tests__/schemas.test.js` | Checkout wizard Zod |
| `features/orders/__tests__/state-machine.test.js` | Todas transiciones válidas/Inválidas |
| `features/orders/__tests__/inventory-deduction.test.js` | Prepared, retail, extras con/sin raw_material |
| `features/orders/__tests__/idempotency.test.js` | Manejo client_ref duplicado |
| `features/orders/__tests__/assign-delivery-concurrency.test.js` | "Tomar entrega" concurrente |
| `features/orders/__tests__/pos-order-creation.test.js` | POS crea orden con channel/taken_by, reusa createOrder |
| `features/reservations/__tests__/overlap-error.test.js` | Parsea error exclusion constraint `23P01`/`excl_reservation_overlap` → mensaje amigable |
| `features/reservations/__tests__/helpers.test.js` | canSeat/canEdit/canCancel + getCustomerName |
| `features/caja/__tests__/cash-close.test.js` | 8 casos: expected vs counted (VES/USD), diferencia, bloqueo de cierre, RB-03 |
| `features/caja/__tests__/financial-txn.test.js` | 2 casos: snapshot moneda/tasa, reglas de transacción |
| `features/caja/__tests__/invoice-credit.test.js` | 4 casos: facturación automática, notas de crédito (RB-04/RB-06) |
| `features/dashboard/__tests__/dashboard-aggregation.test.js` | 14 casos: totales ventas, ticket promedio, órdenes por estado, top productos/combos, formateo moneda/números |

> **Nota:** 4 suites heredadas están rotas por refactor de imports/mocks (`offline-queue`, `assign-delivery-concurrency`, `idempotency`, `inventory-deduction`). Los tests de las fases 0–8 pasan; caja tiene 14/14. Dashboard tiene 14/14. Ver TODOs.

---

## Resumen Fase 10 — Dashboard, Reportes y Auditoría (Completada)

### Implementado
- **Dashboard** (`features/dashboard/`): KPIs por rango de fecha con consultas agregadas en Supabase (RPC), NO trae histórico al cliente. Componentes: StatCard, TopProductsTable, OrdersByStatus, CashStatusWidget, StockAlertWidget (reutilizado Fase 3), DashboardFilters.
- **Reportes/Exportación** (`features/reports/` + `lib/export-utils.js`): CSV para Ventas, Inventario, Caja/Finanzas reutilizando EXACTAMENTE las mismas funciones RPC del dashboard. PDF pendiente (requiere jsPDF).
- **Auditoría** (`features/audit/`): Pantalla owner/admin con filtros entidad/actor/acción/fecha, paginación server-side, tabla con detalle diff JSON expandible.
- **Triggers SQL** (`docs/phase10_audit_triggers.sql`): Auditoría completada para Fases 7 y 8 (restaurant_tables, reservations, reservation_packages, cash_sessions, financial_transactions, invoices, payment_methods, orders status_change, inventory_movements).
- **Funciones RPC** (`docs/phase10_dashboard_rpcs.sql`): get_sales_kpis, get_orders_by_status, get_top_products_sold, get_top_combos_sold, get_cash_session_status, get_low_stock_alerts, get_sales_by_channel, get_sales_by_fulfillment, get_sales_report, get_inventory_report, get_cash_report + counts para paginación.
- **Tests**: `features/dashboard/__tests__/dashboard-aggregation.test.js` (14 tests pasando).

### Archivos SQL para aplicar en Supabase
1. `docs/phase10_dashboard_rpcs.sql` — Funciones RPC para KPIs agregados
2. `docs/phase10_audit_triggers.sql` — Triggers auditoría fases 7 y 8

### Pendientes fase 10
- Exportación PDF (instalar `jspdf` + `jspdf-autotable`)
- Aplicar los 2 archivos SQL en Supabase

---

## Próximos Pasos (hacia Fase 11)

1. **Aplicar SQL pendiente en Supabase**: `docs/fix_rls_caja_phase8.sql` (RLS de caja)
2. **Aplicar SQL Fase 10**: `docs/phase10_dashboard_rpcs.sql` y `docs/phase10_audit_triggers.sql` en Supabase
3. **Instalar dependencias PDF**: `npm install jspdf jspdf-autotable` para exportación PDF completa
4. **Decidir regla de negocio**: si las ventas cobradas suman al balance de Capital (hoy muestra solo `capital_in − capital_out`)
5. **Conectar búsqueda por ítem** en `listInventoryMovements` (el buscador de MovementFilters aún no filtra)
6. **Reparar 4 suites de tests rotas** (offline-queue, delivery concurrency, idempotency, inventory-deduction)
7. **Iniciar Fase 11**: Pulido, revisión RNF completa, auditoría RLS, performance queries + índices

---

## Referencia de Comandos

```bash
# Desarrollo
npm run dev          # Iniciar servidor desarrollo
npm run build        # Build producción
npm run start        # Ejecutar build producción

# Testing
npm test             # Ejecutar Vitest
npm test -- --run    # Ejecutar una vez (sin watch)

# Linting
npm run lint         # ESLint

# Base de Datos (Supabase CLI si configurado)
# supabase db push   # Aplicar migraciones
# supabase db reset  # Reset DB local
```

---

## Variables de Entorno Requeridas (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=tu_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key  # Solo servidor
```

> Nunca commitear credenciales reales. Usar `.env.local.example` como plantilla.