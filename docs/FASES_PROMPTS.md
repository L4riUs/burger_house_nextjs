# Burger House — Fases de construcción (prompts para opencode)

Este documento contiene el plan de fases y, para cada una, el **prompt exacto** a pegar en opencode. Requisitos previos antes de empezar la Fase 0:

- `AGENTS.md` en la raíz del repo (ver documento adjunto).
- `docs/SRS_BurgerHouse.md` en el repo.
- `docs/schema_BurgerHouse.sql` en el repo (o aplicado ya en el proyecto de Supabase).

**Regla general para todas las fases** (ya está en `AGENTS.md`, se repite aquí porque es la más importante): cada fase se trabaja primero en **plan mode**, tú confirmas el plan, y solo entonces se pasa a build mode. Nunca se avanza a la fase siguiente sin que la fase actual esté funcional y probada.

---

## Fase 0 — Bootstrap del proyecto

**Objetivo:** dejar el esqueleto del proyecto corriendo, con Supabase conectado, el esquema aplicado, y las convenciones de `AGENTS.md` verificables (lint, estructura de carpetas, Vitest configurado).

### Prompt Fase 0

```
Estamos en la Fase 0 del proyecto Burger House (ver AGENTS.md y docs/SRS_BurgerHouse.md).

Objetivo de esta fase: bootstrap del proyecto. NO implementes ningún módulo de negocio todavía.

Tareas:
1. Crear el proyecto Next.js (App Router, JavaScript puro, sin TypeScript) usando el
   comando oficial de create-next-app con las flags correctas para JS.
2. Instalar y configurar: Tailwind CSS, shadcn/ui (inicializar con el tema base,
   NO instalar componentes individuales todavía salvo los que shadcn instala por
   defecto en la inicialización), Zustand, Zod, React Hook Form, nextjs-toploader,
   next-themes.
3. Configurar el cliente de Supabase:
   - lib/supabase/client.js (cliente de navegador)
   - lib/supabase/server.js (cliente de servidor, para server actions/route handlers)
   - Variables de entorno en .env.local.example (NUNCA pongas credenciales reales).
4. Aplicar docs/schema_BurgerHouse.sql al proyecto de Supabase (indícame el comando
   o pasos exactos que usarás; si no tienes acceso directo a la base de datos,
   dime qué necesitas de mí para aplicarlo).
5. Crear la estructura de carpetas por feature descrita en AGENTS.md:
   app/, app/admin/, app/(store)/, features/, lib/, components/ui/ (shadcn).
   No crees carpetas de features todavía si no tienen contenido de esta fase.
6. Configurar Vitest (o Jest, decide y justifica brevemente cuál, siguiendo
   AGENTS.md que dice "a definir en Fase 0") con un test trivial que confirme
   que el runner funciona.
7. Configurar next-themes para soporte de modo claro/oscuro (sin diseñar UI
   todavía, solo el provider).
8. AGENTS.md en la raíz (ya debe existir; verifica que opencode lo esté leyendo).

Antes de escribir código, muéstrame el plan (plan mode) con la lista exacta de
archivos que vas a crear/modificar y los comandos que vas a correr. Espera mi
confirmación antes de pasar a build mode.

Al terminar, dame un resumen de: qué quedó funcional, cómo lo verifico
localmente (comandos exactos), y qué queda pendiente para la Fase 1.
```

**Criterios de aceptación:**
- `npm run dev` levanta sin errores.
- `npm test` corre el test trivial de Vitest.
- Conexión a Supabase verificable (puede ser un ping simple).
- Ningún archivo `.ts`/`.tsx` en el repo.

---

## Fase 1 — Autenticación, Perfiles y Roles

**Corresponde a:** SRS RF-01. Esquema: `profiles`, `guest_customers`, `audit_log`, tipo `user_role`.

### Prompt Fase 1

```
Fase 1: Autenticación, Perfiles y Roles (ver SRS RF-01 en docs/SRS_BurgerHouse.md
y las tablas profiles / guest_customers / audit_log en docs/schema_BurgerHouse.sql).

Alcance de esta fase:
1. Registro e inicio de sesión con Supabase Auth (email/password). Formularios
   con React Hook Form + Zod (zodResolver). Usa shadcn/ui para los componentes
   de formulario, respetando las reglas de UI/UX de AGENTS.md (variantes de
   botón correctas, loading states, contraste).
2. Recuperación de contraseña (flujo completo: solicitar reset, correo,
   pantalla de nueva contraseña).
3. Al registrarse un usuario, crear automáticamente su fila en `profiles` con
   role = 'cliente' por defecto (usa un trigger de Postgres on auth.users insert,
   o un server action inmediatamente después del signUp — decide cuál es más
   confiable y explica por qué).
4. Middleware de Next.js (o layout guards) que redirige según el rol:
   - 'cliente' -> tienda pública
   - resto de roles -> /admin
   Un usuario sin sesión solo puede ver la tienda pública (catálogo, sin poder
   pagar) y las páginas de login/registro.
5. Página de perfil (features/profile/): consultar y modificar nombre, teléfono,
   avatar (subida a Supabase Storage), y cambio de contraseña.
6. Pantalla de gestión de usuarios en /admin (solo accesible por owner/admin):
   listar profiles con dual-view (tabla/cards) y paginación server-side, filtro
   por rol, y acción de cambiar el rol de un usuario. Un admin NO puede asignar
   el rol 'owner'. Usa AlertDialog de confirmación antes de cambiar un rol.
7. Aplica las políticas RLS de la tabla profiles: cada usuario lee/edita su
   propio perfil; owner/admin leen y editan cualquiera.
8. Auditoría: cada cambio de rol debe insertar una fila en audit_log
   (actor_id = quien hizo el cambio, entity = 'profiles', diff con el rol
   anterior y el nuevo).
9. Escribe pruebas unitarias (Vitest) para: el esquema Zod de los formularios
   de auth, y la lógica de "qué roles puede asignar cada rol" (un admin no
   puede crear otro owner, etc.) — esa lógica de negocio debe vivir en una
   función pura testeable, no enterrada dentro de un componente.

Antes de tocar código: plan mode con la lista de archivos y las políticas RLS
exactas que vas a crear. Espera confirmación.

Al terminar: resumen de lo implementado, cómo probarlo manualmente paso a paso
(crear un usuario, verificar que aparece en profiles, cambiar su rol, verificar
audit_log), y qué se deja pendiente (ej. OAuth si no se implementó).
```

**Criterios de aceptación:**
- Un usuario nuevo puede registrarse, iniciar sesión, recuperar contraseña.
- `profiles` se llena automáticamente al registrarse.
- Un admin puede cambiar roles desde la UI; un `owner` no se puede degradar por error sin confirmación.
- RLS impide que un `cliente` lea el perfil de otro usuario (verificar con una consulta directa, no solo "la UI no lo muestra").

---

## Fase 2 — Catálogo base: Categorías, Unidades, Materias Primas

**Corresponde a:** SRS RF-02, RF-03, RF-04.

### Prompt Fase 2

```
Fase 2: Categorías, Unidades de Medida y Materias Primas (SRS RF-02, RF-03,
RF-04). Tablas: categories, units, raw_materials.

Alcance:
1. CRUD de `categories`, genérico para applies_to = 'product' | 'raw_material'
   (un solo componente/feature reutilizado con esa distinción, NO dupliques
   la pantalla). Campo name/description como JSONB {es, en}; usa el helper
   getLocalizedField (créalo en lib/i18n.js si no existe) para mostrar el
   texto según el locale activo (por ahora fija locale = 'es' con un TODO
   para selector de idioma futuro).
2. CRUD de `units`, con unit_type y conversion_factor. Al eliminar, valida que
   ninguna raw_material la esté usando; si la usa, soft-delete con advertencia,
   no bloquees silenciosamente.
3. CRUD de `raw_materials`: nombre, categoría, unidad, stock mínimo, costo
   promedio, proveedor principal (proveedores aún no existen como módulo
   propio en esta fase — deja el campo primary_supplier_id nullable y un
   selector vacío/deshabilitado con TODO(fase3): se completa en Fase 3).
   IMPORTANTE: el campo de stock actual NO debe ser editable desde este
   formulario (según SRS RF-04.2, el stock se deriva de inventory_movements,
   que se implementa en una fase posterior). Muestra "Stock: se gestiona en
   el módulo de Inventario" como texto informativo, no como input.
4. Todas las pantallas de listado deben cumplir AGENTS.md: filtros
   contextuales, dual-view tabla/cards, paginación server-side con
   componentes de paginación de shadcn/ui, AlertDialog antes de eliminar,
   skeletons durante carga.
5. Soft-delete real (deleted_at) en las tres entidades, más la pantalla común
   de "Papelera" (features/trash/) que lista elementos con deleted_at no nulo
   de categories, units y raw_materials, con acción de restaurar. Esta
   pantalla de papelera debe quedar genérica para poder sumarle más entidades
   en fases futuras sin rehacerla.
6. Pruebas unitarias: validación Zod de cada formulario, y la función de
   conversión de unidades (conversion_factor) con al menos 3 casos (misma
   unidad, conversión válida entre unidades del mismo unit_type, y el caso de
   error al intentar convertir entre unit_type distintos).

Plan mode primero, con la lista de archivos y confirmación de que vas a
reusar un solo componente de categorías para ambos "applies_to". Espera mi
confirmación.

Resumen final: qué quedó funcional, cómo probarlo, y qué falta (ej. selector
de proveedor pendiente de Fase 3).
```

**Criterios de aceptación:**
- Un mismo componente de Categorías sirve para productos y materias primas (no hay dos pantallas casi iguales).
- El campo de stock de `raw_materials` no es editable desde el formulario.
- La papelera muestra elementos eliminados de las 3 entidades y permite restaurar.

---

## Fase 3 — Proveedores e Inventario (Kardex)

**Corresponde a:** SRS RF-06, RF-07. Tablas: `suppliers`, `inventory_movements`, vista `current_stock`.

### Prompt Fase 3

```
Fase 3: Proveedores e Inventario (SRS RF-06, RF-07).

Alcance:
1. CRUD de `suppliers` (proveedores), con dual-view/paginación/filtros como
   en las fases anteriores.
2. Completa el selector de primary_supplier_id en el formulario de
   raw_materials (pendiente de Fase 2).
3. Módulo de Inventario (features/inventario/):
   - Pantalla de registro de movimiento (inventory_movements): selector de
     tipo de ítem (materia prima / producto retail — los productos retail
     todavía no existen como módulo, así que por ahora solo habilita materia
     prima y deja el selector de producto con TODO(fase4)), tipo de
     movimiento, cantidad, costo unitario si es compra, proveedor si es
     compra, nota.
   - Pantalla de Kardex: historial de movimientos por ítem, filtrable por
     rango de fecha y tipo de movimiento, mostrando el stock resultante
     acumulado (usa la vista current_stock de Supabase, no recalcules en el
     cliente sumando todo el historial cada vez).
   - Alertas de stock bajo: en el listado de materias primas (Fase 2), agrega
     un indicador visual (badge) cuando current_stock < min_stock. Crea
     también un pequeño widget de "Alertas de stock" reutilizable que se
     usará en el Dashboard (Fase 8).
4. Toda esta fase es de solo staff (owner/admin/cajero según definas en RLS,
   documenta qué rol exacto puede registrar movimientos vs. solo consultarlos).
5. Pruebas unitarias: la función que calcula el signo de un movimiento
   (entrada vs salida según movement_type) debe ser una función pura testeable
   (no repliques ese switch/case en varios lugares — es exactamente la misma
   lógica que ya está en la vista SQL current_stock, así que en el cliente
   solo se usa para mostrar el signo correcto en la UI, la fuente de verdad
   del stock siempre es la vista de Supabase).

Plan mode primero. Espera confirmación antes de construir.

Resumen final con instrucciones de prueba manual: crear un proveedor, hacer
una compra de materia prima, verificar que el stock sube en el Kardex, y que
la alerta de stock bajo desaparece si estaba activa.
```

**Criterios de aceptación:**
- El stock mostrado en cualquier pantalla siempre viene de la vista `current_stock`, nunca de un cálculo duplicado en el cliente.
- Se puede ver el historial completo de movimientos de una materia prima específica.

---

## Fase 4 — Productos, Recetas, Adicionales y Combos

**Corresponde a:** SRS RF-05. Tablas: `products`, `recipe_items`, `product_extras`, `product_extra_options`, `combos`, `combo_items`.

### Prompt Fase 4

```
Fase 4: Productos, Recetas, Adicionales y Combos (SRS RF-05).

Alcance:
1. CRUD de `products` con product_type ('prepared' | 'retail'). Un solo
   formulario/tabla, con campos condicionales según el tipo:
   - 'prepared' muestra el editor de receta (recipe_items).
   - 'retail' muestra que su stock se gestiona por Inventario (igual criterio
     que raw_materials en Fase 2: no editable a mano, solo informativo), y
     habilita ahora sí el selector de "producto" en el formulario de
     movimiento de inventario de la Fase 3 (complétalo, tenía un TODO).
2. Editor de receta (recipe_items): agregar/quitar materias primas con
   cantidad y su unidad (mostrar la unidad de la materia prima, no pedirla de
   nuevo). Validar con Zod que la cantidad sea positiva y que no se repita la
   misma materia prima dos veces en una receta.
3. CRUD de `product_extras` (adicionales), con el campo opcional de
   raw_material_id + cantidad (si se linkea, debe descontar inventario al
   venderse — la lógica de venta se implementa en la Fase de Órdenes, aquí
   solo se modela y se guarda el dato). Relación product_extra_options para
   asociar qué extras aplican a qué producto.
4. CRUD de `combos` + `combo_items` (selección de productos y cantidad por
   combo).
5. Catálogo interno con imágenes: subida a Supabase Storage, con preview,
   validación de tamaño/formato con Zod antes de subir.
6. Todas las pantallas siguen las reglas estándar de AGENTS.md (dual-view,
   paginación, filtros, confirmaciones, soft-delete + papelera extendida a
   products y combos).
7. Pruebas unitarias: validación de que una receta no tenga materias primas
   duplicadas, validación de que un combo tenga al menos 1 producto, cálculo
   del precio total de un combo vs. la suma de sus productos (para mostrar el
   "ahorro" al cliente en la tienda más adelante).

Plan mode primero, confirmación antes de construir.

Resumen final: cómo crear un producto 'prepared' con receta de principio a
fin, y cómo probar que la validación de receta duplicada funciona.
```

**Criterios de aceptación:**
- Un producto 'prepared' no se puede guardar sin al menos un ítem de receta (validar, con mensaje claro).
- Un combo no se puede guardar sin al menos un producto.
- Las imágenes se sirven desde Supabase Storage, no como base64 en la base de datos.

---

## Fase 5 — Tienda en línea (Storefront): Catálogo público, Carrito y Checkout

**Corresponde a:** SRS RF-08.

### Prompt Fase 5

```
Fase 5: Tienda en línea pública (SRS RF-08).

Alcance:
1. app/(store)/: catálogo público (solo productos con is_active = true y
   deleted_at null), filtrable por categoría, con buscador. Server components
   para el listado inicial (cacheado — ver AGENTS.md sobre revalidación),
   sin exponer productos inactivos ni datos administrativos.
2. Carrito de compras: Zustand store en features/cart/store.js, persistido
   via lib/storage.js (centralizado, según regla de AGENTS.md — nunca
   localStorage disperso). Debe soportar: productos individuales con extras
   seleccionados, combos, cantidad, y funcionar tanto para usuario autenticado
   como invitado.
3. Checkout (features/checkout/):
   - Paso 1: tipo de cumplimiento (dine_in / pickup / delivery). Si dine_in,
     selector de mesa disponible (solo lectura del estado 'available' de
     restaurant_tables — la asignación real de mesa a la orden ocurre en
     Fase 6/9, aquí solo se captura la preferencia).
   - Paso 2: datos de contacto — si es invitado, formulario para crear
     guest_customers (nombre, teléfono, dirección si es delivery); si está
     autenticado, precarga sus datos de profiles.
   - Paso 3: selección de método de pago (de los payment_methods activos —
     el módulo de métodos de pago aún no existe como CRUD propio, así que
     para esta fase siembra 2-3 métodos de ejemplo directamente en la base
     de datos vía seed, y deja TODO(fase-metodos-pago) para el CRUD real).
   - Confirmación: NO crea todavía la orden en `orders` (eso depende del
     módulo de Órdenes, Fase 6) — deja el checkout armado y listo, con un
     server action `createOrderDraft` que por ahora solo valida con Zod y
     hace console.log/retorna el payload armado. Se conecta de verdad en la
     Fase 6, cuando exista el módulo de órdenes. Sé explícito en el resumen
     final sobre este punto para que no se piense que el checkout ya vende.
4. Pruebas unitarias: el store de Zustand del carrito (agregar, quitar,
   cambiar cantidad, recalcular total con extras/combos), y el esquema Zod
   del checkout completo.

Plan mode primero. Espera confirmación.

Resumen final aclarando explícitamente que el checkout queda listo mecánica y
visualmente pero la creación real de la orden se conecta en la Fase 6.
```

**Criterios de aceptación:**
- El carrito persiste al recargar la página.
- Un usuario no autenticado puede llegar hasta el final del checkout como invitado.
- Ningún producto inactivo o eliminado aparece en el catálogo público.

---

## Fase 6 — Órdenes (Pedidos + Cocina + Delivery unificados)

**Corresponde a:** SRS RF-09, reglas RB-01 y RB-02. Tablas: `orders`, `order_items`, `order_item_extras`, `order_status_history`.

### Prompt Fase 6

```
Fase 6: Órdenes — módulo unificado de Pedidos, Cocina y Delivery (SRS RF-09,
reglas de negocio RB-01 y RB-02 de docs/SRS_BurgerHouse.md sección 3.4).

Esta es la fase más importante de lógica de negocio del proyecto. Léela dos
veces antes de planear.

Alcance:
1. Conecta el checkout de la Fase 5 (createOrderDraft) para que ahora sí cree
   una fila real en `orders` + `order_items` + `order_item_extras`, con
   status inicial 'pending', currency y exchange_rate (por ahora la tasa
   puede ser un valor fijo configurable en una constante o tabla simple de
   configuración — NO implementes integración con un proveedor de tasa de
   cambio en esta fase, deja TODO(fase-config) si hace falta).
2. Implementa la máquina de estados como una función pura y testeable en
   features/orders/state-machine.js: dado un estado actual y un estado
   destino, retorna si la transición es válida según exactamente esta regla
   (RB-02):
     pending -> confirmed -> in_kitchen -> ready -> (out_for_delivery | served) -> completed
     cualquier estado antes de completed -> cancelled
   Ninguna pantalla debe tener su propia lógica de "qué transición es válida"
   por fuera de esta función.
3. Implementa RB-01 (descuento de inventario al confirmar): al pasar una
   orden de 'pending' a 'confirmed', por cada order_item:
   - si es producto 'prepared': generar un inventory_movement 'sale_out' por
     cada recipe_item de ese producto (cantidad receta × cantidad vendida),
     con conversión de unidades si aplica (reutiliza la función de
     conversión de la Fase 2).
   - si es producto 'retail': generar un 'sale_out' de sí mismo.
   - si el order_item tiene order_item_extras con raw_material_id: generar su
     propio 'sale_out'.
   - todos estos movimientos deben llevar order_id para trazabilidad.
   - Esta lógica debe vivir en el servidor (server action), envuelta en una
     transacción de Supabase/Postgres: o se registran todos los movimientos y
     cambia el estado, o no se hace nada (no dejar inventario a medio
     descontar si algo falla a mitad de camino).
   - Si algún ítem quedaría con stock negativo, muestra una advertencia antes
     de confirmar (no bloquees la operación por defecto, según el SRS es
     configurable — implementa el bloqueo como configuración simple, por
     ejemplo una constante ALLOW_NEGATIVE_STOCK, y documenta la decisión).
4. Cada cambio de estado inserta una fila en order_status_history.
5. Panel de Órdenes (staff): lista con dual-view/paginación/filtros por
   estado y tipo de cumplimiento, con botones de acción según el estado
   actual (solo se muestran las transiciones válidas).
6. Vista de Cocina (features/kitchen/): filtra automáticamente órdenes en
   'confirmed'/'in_kitchen', kanban simple con botón para avanzar a
   'in_kitchen' -> 'ready'. Debe actualizarse en tiempo real con Supabase
   Realtime (sin polling) cuando llega una orden nueva o cambia de estado.
   Accesible por rol 'cocina' (y owner/admin).
7. Vista de Delivery (features/delivery/): filtra órdenes 'ready' con
   fulfillment_type = 'delivery'. Botón "Tomar entrega" que asigna
   delivery_profile_id = usuario actual — debe prevenir que dos repartidores
   tomen la misma orden a la vez (usa una condición WHERE delivery_profile_id
   IS NULL en el UPDATE, y verifica que el update afectó una fila; si no,
   informa "esta orden ya fue tomada"). Botón "Marcar entregado" pasa a
   'completed'. Accesible por rol 'delivery'.
8. Seguimiento de pedido para el cliente (parte de RF-08.4): página simple
   donde el cliente ve el estado actual de su orden en tiempo real.
9. **Toma de pedidos internos** (SRS RF-09.6): interfaz interna de "Nueva
   orden" (features/orders/pos/) para que mesero/cajero/admin/owner registren
   un pedido en nombre de un cliente presente en el mostrador o que hizo su
   pedido por teléfono/WhatsApp/mensaje. IMPORTANTE: esto NO es un flujo de
   creación de orden distinto al del checkout de la Fase 5 — es la MISMA
   función de servidor (createOrder) reutilizada desde una UI distinta,
   pensada para velocidad de staff: buscador de productos con resultados
   instantáneos, agregar al pedido con un clic, selector rápido de
   channel ('pos' si el cliente está presente, 'phone' si se tomó a
   distancia), y de guest_customer o profile existente (buscar por
   teléfono/nombre, o crear uno nuevo sin salir de la pantalla). Guarda
   taken_by = usuario actual. Si reescribes o duplicas la lógica de creación
   de orden en vez de reusar la de la Fase 5/checkout, está mal hecho:
   refactoriza para que ambos flujos llamen a la misma función.
10. Pruebas unitarias (esto es obligatorio y crítico, según AGENTS.md toda
   lógica de negocio no trivial lleva tests):
   - todas las transiciones válidas e inválidas de la máquina de estados.
   - el cálculo de movimientos de inventario a generar dado un order_item con
     receta y con extras (casos: producto prepared simple, producto retail,
     producto con extra ligado a materia prima, producto con extra sin
     materia prima ligada).
   - el caso de "tomar entrega" concurrente (simula que la fila ya tiene
     delivery_profile_id asignado y verifica que la función de servidor lo
     rechaza).
   - la interfaz de toma de pedidos internos (punto 9) crea órdenes con
     channel/taken_by correctos y reusa la misma función de creación que el
     checkout (si escribiste un test de creación de orden para el checkout
     en la Fase 5, este debería poder reusar el mismo caso de prueba
     apuntando a la función compartida, no a una copia).

Plan mode primero — en particular quiero ver cómo vas a estructurar la
transacción del punto 3 y cómo vas a compartir la función de creación de
orden entre el checkout público y la interfaz interna del punto 9, antes de
que escribas código. Espera mi confirmación.

Resumen final: flujo completo de prueba manual desde crear una orden en el
storefront hasta marcarla completed, pasando por cocina y delivery, con los
comandos/pasos exactos para verificarlo, y también el flujo de tomar un
pedido de mostrador y uno de teléfono desde la interfaz interna.
```

**Criterios de aceptación:**
- La máquina de estados vive en un solo lugar y tiene pruebas para cada transición válida e inválida.
- Confirmar una orden descuenta inventario real, verificable en el Kardex de la Fase 3.
- Dos repartidores no pueden tomar la misma orden de delivery.
- Cocina y Delivery se actualizan solas (Realtime), sin recargar la página.
- El checkout público y la interfaz interna de "Nueva orden" (mostrador/teléfono) usan la misma función de creación de orden — no hay dos implementaciones paralelas.

---

## Fase 9 — Modo offline para la toma de pedidos internos

**Corresponde a:** SRS RNF-12, regla RB-07. Depende de la Fase 6 (toma de pedidos internos ya debe existir y funcionar online).

### Prompt Fase 9

```
Fase 9: Modo offline para la toma de pedidos internos (SRS RNF-12, regla
RB-07 en docs/SRS_BurgerHouse.md). Depende de que la interfaz de "Nueva
orden" de la Fase 6 (punto 9) ya funcione online.

Lee primero el alcance explícito de RNF-12: esto NO es "modo offline para
todo el sistema". Es específicamente para que el mostrador no pierda una
venta si se corta internet mientras se está tomando el pedido. Cosas que
DELIBERADAMENTE se quedan fuera de esta fase (ya están justificadas en el
SRS, no las implementes):
- Validación o descuento de inventario offline.
- Apertura/cierre de caja offline.
- Cualquier cosa del storefront público.

Alcance:
1. Crea `lib/offline-queue.js`: módulo centralizado (mismo principio que
   lib/storage.js, pero usando IndexedDB en vez de localStorage porque el
   volumen de datos de una cola de pedidos con sus ítems no es apto para
   localStorage). Usa una librería ligera para IndexedDB (por ejemplo `idb`)
   en vez de la API nativa a mano — justifica en tu resumen por qué elegiste
   esa librería. La cola guarda: el payload completo del pedido (igual al
   que usa createOrder de la Fase 6), un client_ref (uuid generado en el
   dispositivo), estado local ('pending_sync', 'synced', 'conflict'), y
   timestamp de creación.
2. Detección de conectividad: usa `navigator.onLine` + listeners de
   'online'/'offline' del navegador para decidir si un pedido nuevo se envía
   directo al servidor o se encola. No implementes Service Worker con
   Background Sync API (soporte inconsistente entre navegadores, en
   particular Safari) — el enfoque de detectar el evento 'online' y disparar
   la sincronización desde la propia pestaña abierta es suficiente para el
   caso de uso de un mostrador con la app siempre abierta en una tablet/PC.
   Documenta esta decisión en tu resumen.
3. Modifica la interfaz de "Nueva orden" (Fase 6, punto 9) para que:
   - Si hay conexión: funciona exactamente igual que antes (llamada directa
     al servidor).
   - Si no hay conexión: guarda el pedido en la cola local con
     client_ref nuevo, muestra confirmación inmediata al staff ("Pedido
     guardado, se sincronizará cuando vuelva la conexión") y lo agrega a una
     lista visible de "Pedidos pendientes de sincronizar" (contador visible
     en la barra de navegación del panel de Órdenes).
4. Sincronización automática: al detectar el evento 'online', recorrer la
   cola en orden y llamar a la misma función createOrder de la Fase 6 para
   cada pedido pendiente, pasando su client_ref. El server action de
   createOrder debe ser idempotente respecto a client_ref (RB-07): si ya
   existe una orden con ese client_ref, no la duplica, simplemente confirma
   que ya está sincronizada. Si el servidor devuelve un error real (ej. un
   producto referenciado ya no existe o fue desactivado), marca ese pedido
   local como 'conflict' en vez de perderlo o reintentarlo indefinidamente.
5. Botón de "Sincronizar ahora" manual, además de la sincronización
   automática al reconectar (para cuando el staff quiere forzarlo sin
   esperar).
6. Pantalla de "Pedidos pendientes/con conflicto": lista los pedidos en
   estado 'pending_sync' y 'conflict' de la cola local, con la posibilidad de
   ver el detalle y, en caso de conflicto, editarlo manualmente antes de
   reintentar (por ejemplo, quitar el producto que ya no existe) o
   descartarlo explícitamente (acción consciente del staff, nunca automática).
7. Un pedido en la cola local ('pending_sync') NO debe aparecer todavía en
   el panel de Órdenes general, Cocina, Delivery, ni afectar caja o
   inventario — solo existe "de verdad" para el resto del sistema una vez
   que sincronizó y quedó creado en `orders`. Dejar esto muy claro en la UI
   para que el staff no piense que ya se procesó.
8. Pruebas unitarias:
   - la cola offline: agregar, listar pendientes, marcar como sincronizado,
     marcar como conflicto.
   - la idempotencia de sincronización: simula llamar dos veces a
     createOrder con el mismo client_ref y verifica que la segunda vez no
     crea una orden duplicada, sino que reconoce la existente.
   - el flujo completo simulado: pedido creado offline -> evento 'online' ->
     se sincroniza -> desaparece de "pendientes" y aparece en el panel de
     Órdenes normal.

Plan mode primero. En particular, muéstrame cómo vas a estructurar la
idempotencia en el server action de createOrder (debe funcionar igual sea
que la orden venga de la Fase 6 online, o de esta cola offline — es la misma
función, solo que a veces recibe un client_ref que ya vio antes). Espera mi
confirmación antes de construir.

Resumen final: cómo simular estar offline en el navegador (DevTools ->
Network -> Offline), tomar un pedido en ese estado, reconectar, y verificar
que sincroniza solo. Y cómo forzar un conflicto (por ejemplo, desactivando un
producto que está en un pedido offline pendiente) para probar ese camino.
```

**Criterios de aceptación:**
- Un pedido tomado sin conexión no se pierde: queda visible como "pendiente de sincronizar" y se envía solo al reconectar.
- Sincronizar el mismo pedido dos veces (por un reintento, por ejemplo) nunca crea una orden duplicada.
- Un pedido pendiente de sincronizar no afecta caja, inventario, cocina ni delivery hasta que efectivamente se sincroniza.
- No se implementó modo offline para el storefront público, apertura/cierre de caja, ni descuento de inventario — eso sigue exigiendo conexión, tal como especifica RNF-12.

---

## Fase 7 — Mesas, Reservas y Paquetes de Reservación

**Corresponde a:** SRS RF-10, RF-11, regla RB-05.

### Prompt Fase 7

```
Fase 7: Mesas, Reservas y Paquetes de Reservación (SRS RF-10, RF-11, RB-05).

Alcance:
1. CRUD de restaurant_tables (mesas): nombre, capacidad, zona, estado, VIP.
   Vista de "mapa de mesas" simple (grid con el estado de cada mesa por
   color) además del dual-view estándar tabla/cards.
2. Conecta el checkout (Fase 5) y el módulo de Órdenes (Fase 6) para que al
   crear una orden dine_in, la mesa seleccionada pase a status 'occupied', y
   al completar/cancelar la orden vuelva a 'available' (si no tiene otra
   orden activa).
3. CRUD de reservation_packages.
4. CRUD de reservations: cliente (o invitado), fecha/hora, personas, mesa o
   paquete, estado. La restricción de no-solapamiento (RB-05) ya está
   implementada a nivel de base de datos con un exclusion constraint
   (excl_reservation_overlap en docs/schema_BurgerHouse.sql) — tu trabajo
   aquí es manejar el error que Postgres devuelve cuando se viola esa
   restricción y mostrar un mensaje claro al usuario en vez de un error
   genérico de base de datos. NO reimplementes la validación de solapamiento
   en el cliente como única defensa (puede servir como UX preventiva, pero
   la fuente de verdad es la restricción de la base de datos).
5. Flujo de "sentar" una reserva: botón que pasa la reserva a 'seated' y la
   mesa asociada a 'occupied'.
6. Pruebas unitarias: al menos un test de integración (o lo más cercano que
   permita Vitest sin un Postgres real, documenta la limitación) que verifique
   que el manejo del error de solapamiento en el server action funciona con
   el código de error real que devuelve Postgres para exclusion constraints.

Plan mode primero. Espera confirmación.

Resumen final: cómo probar manualmente que dos reservas solapadas en la misma
mesa son rechazadas con un mensaje claro.
```

**Criterios de aceptación:**
- No se puede crear una reserva confirmada que se solape con otra en la misma mesa (verificado, no solo confiado a la UI).
- El estado de una mesa refleja correctamente si está ocupada por una orden dine_in o una reserva sentada.

---

## Fase 8 — Caja y Finanzas, Métodos de Pago, Facturación

**Corresponde a:** SRS RF-12, RF-13, RF-14, reglas RB-03, RB-04, RB-06.

### Prompt Fase 8

```
Fase 8: Caja y Finanzas, Métodos de Pago, Facturación (SRS RF-12, RF-13,
RF-14, reglas RB-03, RB-04, RB-06).

Alcance:
1. CRUD real de payment_methods (reemplaza el seed temporal de la Fase 5).
2. Apertura de caja (cash_sessions): formulario de monto inicial VES/USD.
   Refuerza RB-03 (una sola sesión abierta) tanto con la unique index parcial
   ya creada en el esquema (uq_one_open_cash_session) como con una validación
   previa en el server action que dé un mensaje de error claro si ya hay una
   sesión abierta.
3. Conecta el cobro de una orden (Fase 6) para que, al marcarse como pagada,
   genere automáticamente una financial_transaction tipo 'sale' asociada a la
   cash_session abierta, y bloquee el cobro en efectivo si no hay sesión
   abierta (RB-03).
4. Registro manual de financial_transactions de tipo 'expense',
   'capital_in', 'capital_out', 'supplier_payment'.
5. Cierre de caja: calcula expected_amount (inicial + suma de transacciones
   de esa sesión) vs. counted_amount ingresado por el cajero, muestra la
   diferencia, y marca is_open = false.
6. Reporte de Capital: balance acumulado de capital_in/capital_out,
   independiente de las sesiones diarias.
7. Facturación: al marcar una orden como pagada, genera automáticamente una
   fila en `invoices` (snapshot de items, totales, moneda, tasa). Pantalla de
   consulta/reimpresión de facturas. Botón de "Anular" que NO borra la
   factura sino que crea una nueva fila type = 'credit_note' referenciando la
   original (RB-06) — deja esto bien claro en la UI (la factura original
   sigue existiendo, solo queda "anulada" por la nota de crédito asociada).
8. Todo movimiento de dinero debe guardar currency + exchange_rate como
   snapshot (RB-04) — verifica que ningún cálculo recalcule la tasa después,
   siempre usa el valor guardado en el registro histórico.
9. Pruebas unitarias: cálculo de expected_amount en el cierre de caja (varios
   escenarios: solo ventas, ventas + gastos, sesión sin movimientos), la
   validación de "no abrir dos cajas", y la lógica de nota de crédito
   (verifica que la factura original nunca se modifica, solo se crea una
   fila nueva enlazada).

Plan mode primero. Espera confirmación.

Resumen final: flujo de prueba manual de apertura de caja -> venta -> gasto ->
cierre de caja con arqueo, y cómo verificar que una factura anulada generó
una nota de crédito sin borrar el original.
```

**Criterios de aceptación:**
- No se puede tener dos sesiones de caja abiertas (verificado a nivel de base de datos, no solo de UI).
- El cierre de caja muestra correctamente faltante/sobrante.
- Anular una factura nunca borra ni modifica el registro original.

---

## Fase 10 — Dashboard, Reportes y Auditoría

**Corresponde a:** SRS RF-16, Transversal Auditoría.

### Prompt Fase 10

```
Fase 10: Dashboard, Reportes y Auditoría (SRS RF-16 y sección transversal de
Auditoría).

Alcance:
1. Dashboard (features/dashboard/): KPIs por rango de fecha — ventas totales
   (VES/USD), órdenes por estado, top productos vendidos, ticket promedio,
   estado de caja actual, alertas de stock bajo (reusa el widget de la
   Fase 3). Usa consultas agregadas del lado de Supabase (vistas o funciones
   RPC), NO traigas todo el histórico de órdenes al cliente para sumar ahí.
2. Exportación a CSV/PDF de: ventas, inventario, caja/finanzas — reutilizando
   exactamente las mismas consultas del dashboard (no dupliques lógica de
   agregación entre "ver en pantalla" y "exportar").
3. Pantalla de Auditoría (solo owner/admin): consulta de audit_log con
   filtros por entidad, actor y rango de fecha. Verifica que las fases
   anteriores efectivamente estén insertando en audit_log en sus operaciones
   sensibles (cambio de rol, cambio de estado de orden, movimientos de
   inventario, apertura/cierre de caja, anulación de factura, resolución
   manual de un conflicto de sincronización offline de la Fase 9) — si
   alguna fase anterior quedó sin auditar algo que debería, complétalo ahora.
4. Pruebas unitarias: funciones de agregación/formateo usadas en el
   dashboard (cálculo de ticket promedio, top N productos a partir de un
   dataset de prueba).

Plan mode primero. Espera confirmación.

Resumen final: qué eventos quedaron cubiertos por auditoría y cuáles, si los
hay, se dejaron pendientes con justificación.
```

**Criterios de aceptación:**
- El dashboard responde en un tiempo razonable incluso con rangos de fecha amplios (agregación en base de datos, no en cliente).
- Exportar un reporte da exactamente los mismos números que se ven en pantalla.

---

## Fase 11 — Pulido, rendimiento y caché

**Objetivo:** revisar todo el sistema construido en las fases anteriores contra los requisitos no funcionales del SRS (sección 3.3), sin agregar módulos nuevos.

### Prompt Fase 11

```
Fase 11: Pulido, rendimiento y caché — revisión final contra los requisitos
no funcionales del SRS (docs/SRS_BurgerHouse.md sección 3.3). No se agregan
módulos de negocio nuevos en esta fase.

Alcance:
1. Revisa RNF-01 a RNF-04: confirma que el catálogo público usa caché de
   datos de Next.js con revalidación adecuada, que Zustand+lib/storage.js
   es efectivamente el único lugar donde se persiste estado de cliente
   (busca cualquier uso disperso de localStorage/sessionStorage que se te
   haya escapado en fases anteriores y corrígelo), que todos los listados de
   más de ~20 registros están paginados server-side, y que Cocina/Delivery
   siguen actualizándose por Realtime sin polling.
2. Revisa RNF-05 a RNF-07: repasa las políticas RLS de cada tabla creada
   (compáralas contra la plantilla de docs/schema_BurgerHouse.sql) y señala
   cualquier tabla que haya quedado sin política adecuada. Confirma que todo
   formulario tiene validación Zod tanto en cliente como en el server
   action/route handler correspondiente (no solo una de las dos).
3. Revisa RNF-09: confirma que la estructura de carpetas sigue siendo por
   feature y no se acumularon archivos sueltos en una carpeta components/
   genérica.
4. Revisa RNF-10: haz un inventario de qué lógica de negocio no trivial tiene
   pruebas y cuál no (máquina de estados, descuento de inventario, cierre de
   caja, conversión de unidades, solapamiento de reservas, nota de crédito) y
   completa lo que falte.
5. Auditoría de performance básica: identifica las 3-5 consultas más pesadas
   del sistema (probablemente dashboard, kardex, listado de órdenes) y
   confirma que tienen los índices adecuados (ya definidos en
   docs/schema_BurgerHouse.sql, pero verifica planes de consulta si es
   posible).
6. Revisa RNF-12 (modo offline, Fase 9): confirma que el alcance se respetó
   estrictamente (solo toma de pedidos internos, nada de inventario/caja/
   storefront offline), que la cola local nunca deja un pedido "atrapado" sin
   feedback al staff, y que la idempotencia por client_ref sigue funcionando
   si se prueba sincronizar el mismo pedido dos veces.

No hace falta plan mode extenso aquí ya que es una revisión, pero antes de
hacer cambios de código dime qué encontraste y qué vas a corregir, y espera
mi confirmación para los cambios no triviales.

Entrega un informe final: checklist de RNF cumplidos/pendientes, y un resumen
de todo el sistema construido en las 10 fases.
```

---

## Notas generales para todas las fases

- Si una fase necesita algo de una fase futura (por ejemplo, la Fase 5 necesita métodos de pago que no existen hasta la Fase 8), el prompt ya lo indica explícitamente con un stub documentado `// TODO(faseN):`, siguiendo la regla de `AGENTS.md`. No dejes que opencode adelante trabajo de una fase futura por su cuenta.
- Cada fase termina con un resumen escrito de lo implementado y lo pendiente — pídelo siempre aunque el prompt no lo repita, es parte de las reglas fijas de `AGENTS.md`.
- Si en algún punto opencode necesita una tabla o columna que no está en `docs/schema_BurgerHouse.sql`, la instrucción en `AGENTS.md` es que se detenga y te pregunte antes de improvisar el esquema — no lo dejes inventar columnas sobre la marcha.
