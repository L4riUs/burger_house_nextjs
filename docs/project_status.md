# Burger House — Estado del Proyecto

**Última actualización:** 1 de septiembre de 2026  
**Fase actual:** Fase 7 (Mesas, Reservas y Paquetes de Reservación) — En implementación  
**Fases completadas:** 0, 1, 2, 3, 4, 5, 6, 9  
**Fases pendientes:** 7 (en curso), 8, 10, 11

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
| **Fase 7** | 🚧 **En progreso** | Mesas, Reservas y Paquetes: restaurant_tables CRUD + vista mapa/tabla/tarjetas, migración SQL con trigger sync de estado de mesa (occupied/available) + RLS, reservation_packages CRUD (i18n JSONB, price VES vía BCV), reservations CRUD con manejo de exclusion constraint `excl_reservation_overlap` (error amigable), sentar/cancelar reserva, tests unitarios (overlap error + helpers). **Pendiente:** ejecutar `docs/fase7_reservations.sql` en Supabase, registro en Audit de fase 10 |
| **Fase 8** | ⏳ **Pendiente** | Caja y Finanzas: payment_methods CRUD real, cash_sessions (apertura/cierre con RB-03), financial_transactions (sale/expense/capital_in/out/supplier_payment), cierre de caja (expected vs counted), reporte capital, facturación automática + notas de crédito (RB-04, RB-06), snapshot currency/exchange_rate |
| **Fase 9** | ✅ **Completada** | Modo offline POS: lib/offline-queue.js (IndexedDB via idb), detección online/offline (navigator.onLine + listeners), cola pedidos con client_ref/estado/timestamp, sincronización automática al reconectar + botón manual, idempotencia server-side por client_ref (RB-07), pantalla pendientes/conflictos (editar/reintentar/descartar), pedidos offline NO aparecen en panel general/cocina/delivery/caja hasta sincronizar, tests unitarios cola + idempotency + flujo completo |
| **Fase 10** | ⏳ **Pendiente** | Dashboard, Reportes y Auditoría: KPIs agregados en Supabase (ventas, órdenes, top productos, ticket promedio, caja, alertas stock), export CSV/PDF reusando consultas, audit_log UI (filtros entidad/actor/fecha), completar auditoría faltante de fases anteriores |
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
  admin/           # Panel admin (users, inventory, products, orders, POS, offline-queue)
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

### Implementaciones Realtime
- **Cocina** (`features/kitchen/components/KitchenKanban.jsx`): Suscribe a cambios en `orders` (confirmed/in_kitchen), actualiza columnas kanban sin polling
- **Delivery** (`features/delivery/components/DeliveryList.jsx`): Suscribe a `orders` (ready + fulfillment_type=delivery), maneja "tomar entrega" con actualización optimista + confirmación servidor
- **Seguimiento Orden** (`features/orders/tracking/page.jsx`): Actualizaciones realtime de estado para cliente

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

---

## TODOs / Stubs Conocidos para Fases Futuras

| Ubicación | TODO | Fase Objetivo |
|-----------|------|---------------|
| `features/raw-materials/components/RawMaterialForm.jsx` | Selector `primary_supplier_id` (completado Fase 3) | — |
| `features/inventario/components/MovementForm.jsx` | Selector producto retail (completado Fase 4) | — |
| `features/checkout/actions.js` | Stub `createOrderDraft` → reemplazado por `createOrder` real Fase 6 | — |
| `features/checkout/schemas.js` | Payment methods sembrados (TODO: CRUD real Fase 8) | Fase 8 |
| `lib/config.js` | Constante `ALLOW_NEGATIVE_STOCK` (bloqueo/advertencia configurable) | Fase 6 (hecho) |
| `lib/bcv.js` | Integración tasa de cambio (stub) | Fase 10/11 |
| `features/orders/actions.js` | Check idempotencia `client_ref` (implementado Fase 9) | — |
| `app/admin/page.jsx` | Dashboard KPIs (stub) | Fase 10 |
| `features/trash/` | Extender a products, combos (hecho Fase 4) | — |

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

---

## Próximos Pasos (Fase 7)

Según prompt `FASES_PROMPTS.md` Fase 7, el siguiente trabajo incluye:
1. **Ejecutar `docs/fase7_reservations.sql`** en el SQL Editor de Supabase (trigger `sync_table_status_for_orders` + políticas RLS)
2. **"Sentar" reserva a nivel DB**: verificar que estatus 'seated' + creación de orden dine_in marquen la mesa 'occupied' correctamente en conjunto con el trigger
3. **CRUD `reservation_packages`** — implementado (i18n JSONB, price_ves vía BCV, mesas embebidas)
4. **CRUD `reservations`** — implementado (manejo error `excl_reservation_overlap` con mensaje claro)
5. **"Sentar" reserva**: botón para reservation='seated' — implementado
6. **Test unitario**: test estilo integración para manejo error solapamiento — implementado

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