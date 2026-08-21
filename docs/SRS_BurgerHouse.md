# Especificación de Requisitos de Software (SRS)
## Sistema de E-commerce y Gestión Administrativa — Burger House

**Versión:** 2.0 (reconstrucción moderna)
**Basado en:** SRS original v1.0 (IEEE 830, PHP/MySQL) — revisado, depurado y adaptado a stack Next.js/Supabase
**Convención:** IEEE 830, simplificada para consumo por agente de IA (opencode)

---

## 0. Nota de revisión (v1.0 → v2.0)

El documento original tenía 21 "módulos" con mucha duplicación estructural: cada entidad repetía un bloque CRUD casi idéntico (Consultar/Registrar/Modificar/Eliminar), y varios módulos eran en realidad la misma entidad vista desde ángulos distintos. Antes de construir nada, se hizo una limpieza de lógica. Resumen de los cambios y el porqué:

| # | Decisión | Justificación |
|---|---|---|
| 1 | **Productos preparados** y **Productos procesados** se fusionan en una sola tabla `products` con `product_type` (`prepared` \| `retail`). | Eran dos módulos con CRUD idéntico. La única diferencia real es si el producto se cocina a partir de una receta (consume materia prima) o se revende tal cual (consume su propio stock 1:1). Eso se modela con una columna, no con dos módulos completos. |
| 2 | **Categorías de productos preparados**, **categorías de productos procesados** y **categorías de materia prima** se fusionan en una sola tabla `categories` con `applies_to` (`product` \| `raw_material`). | Mismo caso: tres CRUD idénticos para el mismo concepto (agrupar cosas por nombre). |
| 3 | **Entradas de materia prima** y **entradas de productos procesados** se fusionan en un único **ledger de movimientos de inventario** (`inventory_movements`), con `item_type` y `movement_type` (compra, ajuste, merma, transferencia). | Da además trazabilidad real (Kardex) que el SRS original no tenía — antes solo se "registraba una entrada", sin poder ver el historial completo de por qué bajó o subió el stock. |
| 4 | **Gestión de Pedidos**, **Gestión de Cocina** y **Gestión de Delivery** se fusionan en un solo módulo de **Órdenes** con una máquina de estados y vistas filtradas por rol. | En el documento original, "Cocina" y "Delivery" no eran entidades distintas: eran la tabla de órdenes filtrada por estado, con un botón que avanza el estado. Construirlas como 3 módulos separados hubiese triplicado el código para el mismo dato. |
| 5 | **Gestión de Caja** y **Gestión de Capital** se fusionan en un módulo de **Caja y Finanzas**, con una tabla única `financial_transactions` (venta, gasto, aporte de capital, retiro, pago a proveedor) y `cash_sessions` para las aperturas/cierres de turno. | Eran dos libros de movimientos de dinero que en la práctica se necesitan cruzar todo el tiempo (arqueo de caja = suma de transacciones de la sesión). Separarlos obligaba a reportes duplicados. |
| 6 | **Gestión de Facturación** deja de ser un módulo CRUD independiente y pasa a ser un **documento derivado** de una orden pagada (`invoices`, relación 1:1 con `orders`). | En el original, "Facturación" solo tenía una pantalla de "Consultar" — no se registran facturas a mano, se generan solas cuando una orden se cobra. No amerita un módulo de gestión propio, sí una tabla y una vista de reimpresión/anulación (nota de crédito). |
| 7 | **Gestión de Estadísticas** y **Gestión de Reportes** se fusionan: es el mismo dashboard con exportación. | El original tenía RF20 (consultar estadísticas) y RF20.1 (descargar/imprimir estadísticas) como si fueran módulos distintos; es la misma pantalla con un botón "Exportar". |
| 8 | **Mantenimiento (exportar/importar base de datos completa desde la UI)** se elimina del alcance de la aplicación. | Tenía sentido en 2019 con un VPS propio corriendo XAMPP/AppServ. Con Supabase, los respaldos (backups/PITR) son responsabilidad de la infraestructura y se gestionan desde el dashboard de Supabase, no reinventando un exportador de SQL dentro de la app — hacerlo mal es un riesgo de seguridad real (exponer un endpoint que descarga toda la base de datos). |
| 9 | **Gestión de Papelera** deja de ser un módulo por entidad y se convierte en un **patrón transversal de soft-delete** (`deleted_at`) aplicado a las tablas de catálogo, con una sola pantalla de "Papelera" que consulta todas ellas. | Igual que el CRUD, el original hubiese requerido una pantalla de papelera por cada entidad eliminable. |
| 10 | **Bitácora (auditoría)** se mantiene, pero como una única tabla transversal `audit_log` poblada automáticamente (trigger / capa de servidor), no como un módulo que el usuario "gestiona" a mano. | Es infraestructura, no un módulo de negocio. |
| 11 | **Gestión de Roles y Permisos** se simplifica de una matriz dinámica módulo-por-módulo a **roles fijos** (`owner`, `admin`, `cajero`, `mesero`, `cocina`, `delivery`, `cliente`) reforzados con RLS de Supabase. | Un restaurante de una sola sede con ~6 roles no necesita un motor de permisos configurable — eso es complejidad de mantenimiento sin beneficio real. Si en el futuro se necesita más granularidad, se agrega una tabla de overrides puntual; no se construye un motor completo desde el día uno. |
| 12 | **Clientes** deja de ser una entidad 100% aparte de **Usuarios**: se unifica sobre `profiles` (vinculado a `auth.users` de Supabase) para clientes registrados, y se agrega `guest_customers` (nombre/teléfono/dirección, sin cuenta) para pedidos de invitado. | Evita mantener dos tablas de "personas" con lógica de duplicados. |
| 13 | Se agrega **Combos** (mencionado una sola vez en el SRS original, sin desarrollar) como módulo propio, porque es un caso de uso real y valioso para un restaurante de hamburguesas (combo = producto + acompañante + bebida a precio especial). | Vacío funcional real en el documento original que sí aporta valor de negocio. |
| 14 | Se agrega **soporte multi-moneda (Bs / USD)** de forma explícita en toda transacción monetaria (tasa de cambio registrada al momento de la operación), en vez de una mención suelta ("monto inicial en bs y divisa") sin desarrollar. | Necesidad real de operar en Venezuela; el original lo insinuaba sin especificarlo. |
| 15 | Los **Adicionales/Extras** (ej. bacon extra, queso extra) ahora pueden enlazarse opcionalmente a una materia prima, para que descuenten inventario real al venderse — en el original eran solo un precio adicional sin efecto en el stock. | Corrección de un hueco de lógica: vender 50 "bacon extra" sin mover el inventario de tocino es un error de negocio. |

**Resultado:** de 21 módulos con bastante redundancia estructural se pasa a **16 módulos** sin duplicación de lógica, más 2 patrones transversales (auditoría, papelera) que no son módulos de negocio sino infraestructura compartida.

---

## 1. Introducción

### 1.1 Propósito

Definir las especificaciones funcionales y no funcionales para la reconstrucción del sistema de e-commerce y gestión administrativa del restaurante **Burger House**, sobre un stack moderno (Next.js + Supabase), manteniendo el alcance de negocio del sistema original pero corrigiendo duplicidades de diseño y modernizando decisiones técnicas obsoletas (backups manuales, roles hardcodeados en PHP, etc.).

### 1.2 Alcance

El sistema cubre dos frentes:

1. **Tienda en línea (storefront)**: catálogo público de productos, carrito, checkout, seguimiento de pedido, cuenta de cliente, reservas de mesa.
2. **Panel administrativo/operativo**: gestión de catálogo, inventario, proveedores, órdenes, cocina, delivery, mesas, reservas, caja, finanzas, usuarios/roles, dashboard y reportes.

Es un sistema **de una sola sede** (single-tenant): un restaurante, una base de datos, sin necesidad de aislar `tenant_id` como en un SaaS multi-cliente. Si en el futuro Burger House abre una segunda sucursal, el concepto de `branch_id` puede añadirse de forma incremental sin rehacer el modelo (se deja previsto en el esquema, ver `docs/schema_BurgerHouse.sql`).

### 1.3 Personal involucrado

| Rol | Responsabilidad |
|---|---|
| Product owner / dueño del negocio | Define reglas de negocio, valida cada fase |
| Agente de IA (opencode) | Construye el sistema fase por fase siguiendo `AGENTS.md` y `docs/FASES_PROMPTS.md` |

### 1.4 Definiciones, acrónimos y abreviaturas

| Término | Definición |
|---|---|
| RF | Requisito Funcional |
| RNF | Requisito No Funcional |
| BOM | Bill of Materials — receta que enlaza un producto preparado con las materias primas que consume |
| RLS | Row Level Security (Supabase/Postgres) |
| Kardex | Historial cronológico de movimientos de inventario de un ítem |
| Soft delete | Borrado lógico: se marca `deleted_at`, no se elimina la fila físicamente |
| POS | Point of Sale — módulo de venta en mostrador/caja |
| VES / USD | Bolívar soberano / Dólar estadounidense — monedas soportadas |

### 1.5 Resumen

El resto del documento describe: (2) visión general del producto, tipos de usuario y restricciones; (3) requisitos funcionales por módulo, requisitos no funcionales y reglas de negocio críticas que todo el sistema debe respetar.

---

## 2. Descripción general

### 2.1 Perspectiva del producto

Aplicación web full-stack construida en **Next.js (App Router, JavaScript puro — sin TypeScript)**, con **Supabase** (Postgres + Auth + Storage + Realtime) como backend. Interfaz basada en **shadcn/ui** + Tailwind. Estado de cliente con **Zustand**, validación con **Zod**, formularios con **React Hook Form**. Ver `AGENTS.md` para las reglas de código no negociables.

### 2.2 Módulos del sistema

1. Autenticación y Perfiles (roles fijos)
2. Categorías (genérico: producto / materia prima)
3. Unidades de Medida
4. Materias Primas
5. Productos (preparados y de reventa) + Recetas (BOM) + Adicionales + Combos
6. Proveedores
7. Inventario — Movimientos de Stock (Kardex)
8. Tienda en línea — Catálogo público, Carrito y Checkout
9. Órdenes (unifica pedidos, cocina, delivery)
10. Mesas
11. Reservas y Paquetes de Reservación
12. Caja y Finanzas (sesiones de caja + libro de movimientos financieros)
13. Facturación (documento derivado de la orden)
14. Métodos de Pago
15. Clientes (perfil extendido de usuario con rol `cliente`, + invitados)
16. Dashboard y Reportes

Transversales (no son pantallas de "gestión", son infraestructura que todos los módulos usan): **Auditoría (`audit_log`)** y **Papelera (soft-delete)**.

### 2.3 Tipos de usuario

| Rol | Acceso |
|---|---|
| `owner` | Acceso total, incluida configuración del sistema y gestión de usuarios/roles |
| `admin` | Todo excepto configuración crítica del sistema (p. ej. no puede crear otros `owner`) |
| `cajero` | Caja, órdenes, métodos de pago, facturación, clientes |
| `mesero` | Mesas, reservas, creación de órdenes en salón |
| `cocina` | Vista de cocina (órdenes filtradas por estado `in_kitchen`/`ready`), recetas |
| `delivery` | Vista de delivery (órdenes filtradas por `fulfillment_type = delivery`) |
| `cliente` | Tienda en línea: catálogo, carrito, checkout, historial de pedidos, reservas propias |
| Invitado (sin cuenta) | Puede navegar catálogo y hacer checkout como invitado (guest) |

### 2.4 Restricciones

- Next.js App Router, JavaScript puro (`.js`/`.jsx`, nunca `.ts`/`.tsx`).
- Supabase como único backend (Postgres + Auth + Storage + Realtime). RLS activo en toda tabla sensible.
- El sistema debe operar correctamente en un solo restaurante (single-tenant), pero el esquema deja espacio para `branch_id` a futuro sin romper nada.
- Soporte de doble moneda (VES/USD) en toda operación monetaria.
- El sistema debe mantener la identidad visual de Burger House (colores institucionales, definidos en fase de UI).

### 2.5 Supuestos y dependencias

- Se asume conexión a internet estable en el local (Supabase es un servicio en la nube; no hay modo 100% offline salvo el caché local del carrito/sesión de POS descrito en RNF).
- Los respaldos de base de datos son responsabilidad de la infraestructura (Supabase), no de la aplicación.

---

## 3. Requisitos específicos

### 3.1 Requisitos de interfaz

- **Interfaz de usuario**: web responsive (mobile-first para el catálogo público, desktop-first para el panel administrativo). Componentes shadcn/ui, feedback de carga (`nextjs-toploader` + skeletons), modales de confirmación en toda acción destructiva.
- **Interfaz de hardware**: ninguna dependencia de hardware específico. El módulo de caja debe funcionar con teclado/mouse/touch estándar (no requiere lector fiscal ni impresora térmica en la v1; se deja como extensión futura la impresión de tickets vía navegador).
- **Interfaz de software**: Supabase (Postgres/Auth/Storage/Realtime), pasarela(s) de pago a definir en fase de checkout (fuera del alcance inicial: se deja un adaptador genérico `payment_provider` para no acoplar el modelo a un proveedor específico).
- **Interfaz de comunicación**: HTTPS únicamente. Webhooks de Supabase/Storage donde aplique.

### 3.2 Requisitos funcionales

Cada módulo se describe con sus operaciones (el CRUD básico se asume implícito en "Gestión de X: registrar, consultar, modificar, eliminar (soft-delete)"; solo se detalla lo que tiene lógica de negocio no trivial).

#### RF-01 — Autenticación y Perfiles
- RF-01.1 Registro e inicio de sesión (Supabase Auth: email/password; opcional OAuth).
- RF-01.2 Recuperación de contraseña vía correo.
- RF-01.3 Cada usuario autenticado tiene un `profile` con `role` fijo (ver 2.3). El `role` determina qué rutas/RLS puede usar; no existe un editor de permisos dinámico en v1.
- RF-01.4 Un `owner`/`admin` puede cambiar el rol de otro usuario (excepto asignar `owner` si no es `owner`).
- RF-01.5 Consultar y modificar el perfil propio (nombre, foto, teléfono).

#### RF-02 — Categorías
- RF-02.1 CRUD de categorías, con `applies_to` (`product` | `raw_material`) y campo de nombre traducible (JSONB `{"es": "...", "en": "..."}`, ver `getLocalizedField` en `AGENTS.md`).
- RF-02.2 No se puede eliminar (hard-delete) una categoría con productos/materias primas asociadas; solo soft-delete, y el sistema debe advertir cuántos ítems quedarían huérfanos.

#### RF-03 — Unidades de Medida
- RF-03.1 CRUD de unidades (kg, g, l, ml, unidad, etc.), con `unit_type` (masa, volumen, unidad) y `conversion_factor` respecto a una unidad base de su tipo, para permitir conversiones automáticas en recetas (ej. receta en gramos, compra en kilos).

#### RF-04 — Materias Primas
- RF-04.1 CRUD de materias primas: nombre, categoría, unidad base, stock mínimo (para alertas), costo promedio.
- RF-04.2 El stock de una materia prima **nunca se edita directamente**; solo cambia a través de `inventory_movements` (ver RF-07). El campo `current_stock` es una vista/derivado calculado, no un valor editable a mano desde el formulario.

#### RF-05 — Productos, Recetas, Adicionales y Combos
- RF-05.1 CRUD de productos con `product_type` (`prepared` | `retail`), precio, categoría, imágenes, disponibilidad (activo/inactivo, agotado).
- RF-05.2 Si `product_type = prepared`: el producto tiene una **receta** (`recipe_items`): lista de materias primas + cantidad requerida. Al venderse, se descuenta automáticamente el stock de cada materia prima según la receta (ver regla de negocio RB-01).
- RF-05.3 Si `product_type = retail`: el producto tiene su propio stock (se maneja igual que una materia prima, vía `inventory_movements`, pero de tipo `product`).
- RF-05.4 **Adicionales** (`product_extras`): modificadores opcionales de un producto (ej. "bacon extra") con precio propio y, opcionalmente, un enlace a una materia prima + cantidad que también se descuenta al vender.
- RF-05.5 **Combos**: agrupación de productos a precio especial (`combos` + `combo_items`). Al vender un combo, se descuenta el inventario de cada producto/receta incluido, como si se hubiesen vendido por separado.

#### RF-06 — Proveedores
- RF-06.1 CRUD de proveedores: nombre, contacto, RIF, materias primas que suministra (relación opcional).

#### RF-07 — Inventario (Kardex de movimientos)
- RF-07.1 Registrar un movimiento de inventario (`inventory_movements`) con: ítem (materia prima o producto retail), tipo de movimiento (`purchase_in`, `sale_out`, `adjustment_in`, `adjustment_out`, `waste`, `transfer`), cantidad, costo unitario (si aplica), proveedor (si es compra), usuario responsable, nota.
- RF-07.2 Consultar historial de movimientos por ítem, con filtros de fecha/tipo.
- RF-07.3 Alertas de stock bajo (comparando `current_stock` calculado contra `min_stock` configurado en el ítem).
- RF-07.4 Las salidas por venta (`sale_out`) las genera el sistema automáticamente al confirmarse una orden (RB-01); el usuario no las registra a mano.

#### RF-08 — Tienda en línea (Storefront)
- RF-08.1 Catálogo público filtrable por categoría, con buscador.
- RF-08.2 Carrito de compras persistente (Zustand + `localStorage` centralizado en `lib/storage.js`, según regla de `AGENTS.md`), soporta invitado y usuario autenticado.
- RF-08.3 Checkout: selección de tipo de entrega (`dine_in`, `pickup`, `delivery`), datos de contacto/dirección si aplica, selección de método de pago, confirmación.
- RF-08.4 Seguimiento de pedido en tiempo real (Supabase Realtime) para el cliente, mostrando el estado actual de la orden.

#### RF-09 — Órdenes (unifica Pedidos + Cocina + Delivery)
- RF-09.1 Toda orden tiene: ítems (productos/combos/adicionales), tipo de cumplimiento (`dine_in`/`pickup`/`delivery`), mesa (si `dine_in`), cliente o invitado, totales en VES y USD, tasa de cambio usada.
- RF-09.2 Máquina de estados única (ver RB-02): `pending → confirmed → in_kitchen → ready → (out_for_delivery | served) → completed`, con rama a `cancelled` desde cualquier estado previo a `completed`.
- RF-09.3 **Vista de Cocina**: lista/kanban de órdenes en estado `confirmed`/`in_kitchen`, con acción de avanzar a `ready`. Accesible por rol `cocina` (y `admin`/`owner`).
- RF-09.4 **Vista de Delivery**: lista de órdenes `ready` con `fulfillment_type = delivery`, con acción de "tomar entrega" (asigna repartidor, evita doble asignación) y "marcar entregado". Accesible por rol `delivery`.
- RF-09.5 Cada cambio de estado queda registrado en `order_status_history` (quién, cuándo, de qué estado a qué estado).

#### RF-10 — Mesas
- RF-10.1 CRUD de mesas: nombre/número, capacidad, zona, estado (`available`, `occupied`, `reserved`, `out_of_service`).

#### RF-11 — Reservas y Paquetes de Reservación
- RF-11.1 CRUD de reservas: cliente, fecha/hora, cantidad de personas, mesa o paquete asociado, estado (`pending`, `confirmed`, `seated`, `cancelled`, `no_show`).
- RF-11.2 CRUD de paquetes de reservación (ej. "Paquete cumpleaños"): nombre, descripción, precio, capacidad, mesas incluidas.
- RF-11.3 No se puede confirmar una reserva sobre una mesa que ya tiene otra reserva confirmada en un rango de horario solapado.

#### RF-12 — Caja y Finanzas
- RF-12.1 Apertura de caja (`cash_sessions`): monto inicial en VES y USD, usuario responsable. Solo puede haber una sesión abierta por caja/terminal a la vez.
- RF-12.2 Registrar movimientos financieros (`financial_transactions`): venta (generado automáticamente al cobrar una orden), gasto, aporte de capital, retiro de capital, pago a proveedor — cada uno con moneda, monto, tasa de cambio, sesión de caja asociada (nullable para movimientos de capital que no dependen de una sesión).
- RF-12.3 Cierre de caja: calcula el esperado (inicial + transacciones de la sesión) vs. el monto contado, muestra diferencia (faltante/sobrante), bloquea nuevas ventas hasta abrir sesión nueva.
- RF-12.4 Reporte de capital: balance acumulado de aportes/retiros, independiente de las sesiones de caja diarias.

#### RF-13 — Facturación
- RF-13.1 Al completarse el pago de una orden, se genera automáticamente un registro en `invoices` (número correlativo, datos fiscales básicos, snapshot de ítems y totales).
- RF-13.2 Consultar/reimprimir facturas por rango de fecha, cliente o tipo de orden.
- RF-13.3 Anulación de factura genera una **nota de crédito** (`invoices` con `type = credit_note` referenciando la factura original), nunca se borra una factura emitida.

#### RF-14 — Métodos de Pago
- RF-14.1 CRUD de métodos de pago aceptados (efectivo VES, efectivo USD, Pago Móvil, transferencia, tarjeta, Cashea u otro BNPL, etc.), con moneda asociada.

#### RF-15 — Clientes
- RF-15.1 Todo cliente registrado es un `profile` con `role = cliente`. Se pueden ver sus datos, historial de pedidos y reservas desde el panel administrativo.
- RF-15.2 Pedidos de invitado (sin cuenta) se guardan en `guest_customers` (nombre, teléfono, dirección) y se enlazan a la orden vía `guest_customer_id`.

#### RF-16 — Dashboard y Reportes
- RF-16.1 Panel con KPIs por rango de fecha: ventas totales (VES/USD), órdenes por estado, productos más vendidos, ticket promedio, estado de caja, alertas de stock bajo.
- RF-16.2 Exportación de reportes (CSV/PDF) para: ventas, inventario, caja/finanzas.
- RF-16.3 Los reportes usan las mismas consultas del dashboard (no hay lógica duplicada entre "ver en pantalla" y "exportar").

#### Transversal — Auditoría
- Toda operación de creación/modificación/eliminación sobre tablas de negocio queda registrada en `audit_log` (actor, acción, entidad, entidad_id, diff, fecha), sin pantalla de "gestión" propia — solo consulta/filtro para `owner`/`admin`.

#### Transversal — Papelera
- Las tablas de catálogo (`products`, `raw_materials`, `categories`, `suppliers`, `guest_customers`) usan soft-delete (`deleted_at`). Una única pantalla "Papelera" lista elementos eliminados de cualquiera de esas tablas, con opción de restaurar.

### 3.3 Requisitos no funcionales

**Rendimiento y caché**
- RNF-01 Las consultas de catálogo público (productos, categorías) deben cachearse (Next.js data cache / Supabase + revalidación) dado que cambian con poca frecuencia comparado con las órdenes.
- RNF-02 El estado de UI de alta frecuencia (carrito, filtros, sesión de POS) vive en Zustand con persistencia centralizada en `lib/storage.js`; no se debe golpear la base de datos en cada interacción de UI.
- RNF-03 Listados con más de ~20 registros deben paginarse server-side (`range()` de Supabase).
- RNF-04 Las vistas de Cocina/Delivery deben actualizarse en tiempo real (Supabase Realtime) sin necesidad de recargar la página ni hacer polling agresivo.

**Seguridad**
- RNF-05 RLS habilitado en toda tabla con datos sensibles o de negocio. Ninguna consulta debe depender solo de la validación del lado del cliente.
- RNF-06 Contraseñas gestionadas exclusivamente por Supabase Auth (nunca se guardan hashes propios).
- RNF-07 Toda entrada de formulario se valida con Zod tanto en cliente (React Hook Form) como en el server action / route handler correspondiente.

**Fiabilidad y disponibilidad**
- RNF-08 El sistema debe operar durante el horario de atención del restaurante sin degradación perceptible; los reportes de rango amplio no deben bloquear operaciones de venta (usar consultas agregadas, no traer todo el histórico al cliente).

**Mantenibilidad**
- RNF-09 Estructura por *feature*, no por tipo de archivo (ver `AGENTS.md`).
- RNF-10 Cada módulo con lógica de negocio no trivial (descuento de inventario por receta, cierre de caja, conversión de moneda, máquina de estados de órdenes) debe tener pruebas unitarias (Vitest).

**Portabilidad**
- RNF-11 Next.js + Supabase, sin dependencias de un proveedor de hosting específico más allá de lo estándar de Next.js/Vercel-compatible y Supabase.

### 3.4 Reglas de negocio críticas (RB)

- **RB-01 — Descuento de inventario al vender:** al pasar una orden a `confirmed`, por cada ítem de la orden: si es producto `prepared`, se generan movimientos `sale_out` por cada materia prima de su receta (cantidad receta × cantidad vendida, con conversión de unidades si aplica); si es producto `retail`, se genera un `sale_out` de sí mismo; si tiene adicionales enlazados a materia prima, también generan su propio `sale_out`. Si el stock resultante de algún ítem quedaría negativo, el sistema debe advertir antes de confirmar (no bloquear obligatoriamente salvo que el negocio decida lo contrario — configurable).
- **RB-02 — Máquina de estados de la orden:** las transiciones válidas son exactamente las descritas en RF-09.2. Ninguna pantalla (cocina, delivery, admin) puede saltarse un estado ni mover una orden a un estado no permitido desde el actual.
- **RB-03 — Sesión de caja única:** no puede abrirse una nueva `cash_session` si ya existe una abierta para la misma caja/terminal. Ninguna venta con pago en efectivo puede registrarse sin una sesión de caja abierta.
- **RB-04 — Doble moneda:** toda tabla con montos (`orders`, `financial_transactions`, `invoices`) guarda el monto en la moneda de origen **y** la tasa de cambio VES/USD vigente al momento de la operación (snapshot, no recalculado después), para que los reportes históricos no cambien si la tasa cambia mañana.
- **RB-05 — Reservas sin solapamiento:** ver RF-11.3.
- **RB-06 — Facturas inmutables:** ver RF-13.3, nunca se edita ni borra una factura emitida.

---

## 4. Trazabilidad con el SRS original

Para referencia del equipo, esta tabla mapea los RF del documento original (v1.0) a su ubicación en v2.0:

| RF original | Módulo original | Ubicación en v2.0 |
|---|---|---|
| RF01 | Iniciar sesión | RF-01 |
| RF2.1 / RF2.6 | Productos preparados / procesados | RF-05 |
| RF2.2 | Materias primas | RF-04 |
| RF2.3 / RF2.7 | Entradas materia prima / productos procesados | RF-07 |
| RF2.4 | Recetas | RF-05.2 |
| RF2.5 | Adicionales | RF-05.4 |
| RF3 | Proveedores | RF-06 |
| RF4 | Clientes | RF-15 |
| RF5 | Caja | RF-12 |
| RF6 | Facturación | RF-13 |
| RF7 | Unidades | RF-03 |
| RF8.1 / RF8.2 | Categorías (producto/materia prima) | RF-02 |
| RF9 | Métodos de pago | RF-14 |
| RF10 | Usuarios | RF-01 |
| RF11 | Roles y permisos | RF-01.3/1.4 |
| RF12 | Mantenimiento (export/import DB) | Fuera de alcance (ver nota 0, punto 8) |
| RF13 | Órdenes | RF-09 |
| RF14 | Delivery | RF-09.4 |
| RF15 | Cocina | RF-09.3 |
| RF16 | Mesas | RF-10 |
| RF17 | Reservaciones | RF-11.1 |
| RF18 | Paquetes de reservación | RF-11.2 |
| RF19 | Capital | RF-12.4 |
| RF20 | Estadísticas / Reportes | RF-16 |
| RF21 | Perfil de usuario | RF-01.5 |
| (mención suelta) | Combos | RF-05.5 (nuevo, desarrollado) |
| (implícito, sin RF) | Papelera | Transversal (sección 3.2, patrón soft-delete) |
| (implícito, sin RF) | Bitácora | Transversal (sección 3.2, `audit_log`) |
