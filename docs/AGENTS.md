# AGENTS.md — Burger House

Este archivo es leído automáticamente por opencode al iniciar cualquier sesión en este repositorio. Contiene las reglas fijas del proyecto para que cada fase se construya de forma consistente, sin tener que repetirlas en cada prompt.

## Stack (no negociable)

- **Next.js** (App Router) en **JavaScript puro — NUNCA TypeScript**. No crear archivos `.ts`/`.tsx`; todo en `.js`/`.jsx`.
- **Supabase**: Postgres + Auth + Storage + Realtime. RLS habilitado en toda tabla con datos sensibles o de negocio (ver `docs/schema_BurgerHouse.sql` para la plantilla de políticas).
- **Zustand** para estado global de cliente (carrito, sesión de UI, filtros).
- **Zod** para validar TODOS los datos entrantes: formularios y también en el borde de cualquier server action / route handler (no confiar solo en el cliente).
- **React Hook Form** + Zod (`zodResolver`) para todos los formularios.
- **shadcn/ui** como librería base de componentes.
- **nextjs-toploader** para feedback de transición de página.
- **next-themes** para modo claro/oscuro.
- Tailwind CSS para estilos.

Este proyecto es **single-tenant** (una sola sede de Burger House). No se implementa lógica multi-tenant ni `tenant_id`. El esquema deja un campo `branch_id` reservado por si en el futuro se abre una segunda sede, pero esa lógica no se activa en ninguna fase de este plan.

## UI, UX y Accesibilidad (no negociable)

- **Jerarquía visual y botones:** diferenciar estrictamente acciones primarias, secundarias y destructivas. Usar SIEMPRE las variantes correctas de `shadcn/ui` (`default` para primarias, `secondary`/`outline` para alternativas, `ghost` para acciones sutiles, `destructive` para acciones peligrosas).
- **Contraste y legibilidad:** nunca texto gris claro sobre blanco ni texto oscuro sobre fondo oscuro. Usar las variables CSS estándar de shadcn/ui (`text-primary`, `text-muted-foreground`, `bg-background`, `bg-muted`).
- **Navegación SPA:** usar siempre `next/link` para rutas internas. Prohibido `<a>` crudo o cualquier método que fuerce recarga completa.
- **Filtrado por módulo:** todo módulo de gestión con datos debe incorporar filtros propios de su dominio.
- **Vista dual:** los módulos que listan colecciones deben implementar alternancia entre Vista de Tabla y Vista de Tarjetas.
- **Paginación:** toda lista de registros debe paginarse, preferiblemente server-side con `range()` de Supabase, usando los componentes de paginación de `shadcn/ui`.
- **Modales de confirmación:** SIEMPRE usar `AlertDialog`/`Dialog` antes de acciones destructivas o ediciones sensibles.
- **Estados de carga:** nunca dejar al usuario sin feedback visual durante operaciones asíncronas. Navegación global -> `nextjs-toploader`. Carga a nivel de componente -> Skeletons de shadcn/ui. Botones deshabilitados (`disabled={true}`) con indicador de carga mientras se envía un formulario.

## Fuentes de verdad del proyecto

- `docs/SRS_BurgerHouse.md` — especificación funcional completa. Ante cualquier duda de comportamiento, este documento manda.
- `docs/schema_BurgerHouse.sql` — esquema real de base de datos, ya definido. **No inventar columnas ni tablas nuevas** sin revisar primero si ya existen aquí. Si una fase necesita una tabla/columna que no existe, detente y pregúntame explícitamente en vez de improvisar el esquema.
- `docs/FASES_PROMPTS.md` — plan de fases y criterios de aceptación de cada una.
- No usar archivos temporales en carpetas `temp/` o `tmp/`. Se rechazan.
- Cuando algo funciona, no dar el tema por cerrado sin verificar que todo sigue funcionando junto. Una vez verificado, no se vuelve a tocar ese tema sin necesidad.
- No tocar `package.json` ni nada relacionado a dependencias salvo que sea estrictamente necesario y yo lo pida explícitamente, verificando que las dependencias queden instaladas.

## Convenciones de código

- Estructura por *feature*, no por tipo de archivo: `app/admin/inventario/`, `app/(store)/`, `features/inventario/`, `features/orders/`, etc. Evitar una carpeta `components/` plana y gigante.
- Cada feature con estado propio usa su propio store de Zustand (`features/cart/store.js`), no un store global monolítico.
- Cada esquema de validación Zod vive junto a la feature que lo usa (`features/inventario/schemas.js`), reutilizable entre formulario (cliente) y server action (servidor).
- Campos multi-idioma son JSONB (`{"es": "...", "en": "..."}`, ver SRS sección 3.2 RF-02). Usar un helper reutilizable `getLocalizedField(field, locale)` en vez de repetir el fallback en cada componente.
- No usar `localStorage`/`sessionStorage` directamente disperso por el código: centralizar en un módulo `lib/storage.js` (usado por el carrito persistente, entre otros).
- Ninguna lógica de negocio no trivial (máquina de estados de órdenes, descuento de inventario por receta, cierre de caja, conversión de unidades, solapamiento de reservas) vive únicamente dentro de un componente de UI — debe existir como función pura en un módulo de la feature, testeable de forma aislada.
- El stock de materias primas y de productos `retail` **nunca** se edita directamente desde un formulario: siempre se deriva de `inventory_movements` (ver SRS RF-04.2 y RF-07).
- Toda tabla con montos guarda moneda + tasa de cambio como snapshot histórico (ver SRS regla RB-04). Ningún reporte recalcula una tasa pasada.

## Terminal y gestión de paquetes

- **Tiempos de instalación:** al usar `npm install`, `npx` o similares, esperar pacientemente a que el proceso termine por completo antes de continuar o escribir el siguiente bloque de código.
- **Visibilidad de logs:** prohibido usar redirecciones para ocultar errores o salidas (nada de `> /dev/null`, `2>&1`, `1>2`, ni enviar procesos a segundo plano con `&`). La salida del comando debe fluir naturalmente para poder leer los errores reales.
- **Comandos oficiales:** usar estrictamente los comandos recomendados por la documentación oficial del stack (Next.js, shadcn/ui, Supabase, etc.). No inventar flags, no usar alias raros, no abreviar comandos si la documentación no lo indica explícitamente.

## Cómo trabajar cada fase

1. Antes de escribir código, usar **plan mode** (`Tab` en la TUI) para proponer el enfoque y la lista de archivos a crear/editar. Esperar confirmación antes de pasar a build mode.
2. Cada fase se entrega funcional y probada antes de pasar a la siguiente (no dejar features a medias que rompan una fase anterior).
3. Si una fase necesita algo de una fase futura, implementarlo con un stub simple documentado con `// TODO(faseN):` y continuar — no adelantarse a construir el módulo completo fuera de orden.
4. Al final de una fase, dejar un resumen corto de lo implementado y lo pendiente/como TODO para fases futuras.

## Pruebas

- Cada fase con lógica de negocio no trivial (máquina de estados de órdenes, descuento de inventario, conversión de unidades, cierre de caja, solapamiento de reservas, notas de crédito) debe incluir pruebas unitarias con **Vitest**.
- No se exige cobertura total, pero sí cubrir los casos de negocio explícitamente descritos en el SRS (sección 3.4, Reglas de negocio críticas).
