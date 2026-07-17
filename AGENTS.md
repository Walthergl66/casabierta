# DreamCanvas AI — Contexto del Proyecto

> Fichero de contexto persistente para agentes. **Léelo antes de tocar código y actualízalo al terminar cada tarea.**
> Fuente de la especificación original: `plan.md` (no modificar; es el brief del usuario).

## Qué es

App web para la Casa Abierta del Club de Inteligencia Artificial. El usuario escribe un prompt en
lenguaje natural, un LLM lo mejora, y un proveedor de IA genera una imagen descargable en segundos.

Debe aguantar **cientos de visitantes** durante un evento presencial. Prioridades, en orden:
fluidez > impacto visual > exhaustividad de features.

## Decisiones tomadas (no re-litigar sin preguntar)

| Tema | Decisión | Motivo |
|---|---|---|
| Base de datos | Supabase PostgreSQL, **vía pooler** | La conexión directa es IPv6-only y la red del usuario no tiene IPv6 |
| Storage | Supabase Storage, bucket `images` | Idem |
| Redis | Local vía Docker Compose | El usuario no tiene Upstash todavía; migrable cambiando `REDIS_URL` |
| Proveedor por defecto | `pollinations` | Gratis y sin API key: no se agotan créditos durante el evento |
| Otros proveedores | Implementados pero inactivos | Se activan solo con `IMAGE_PROVIDER=` |
| Gestor de paquetes | npm workspaces | Node 24 / npm 11 en la máquina |

## Estructura

```
casabierta/
├── AGENTS.md            ← este fichero
├── plan.md              ← brief original del usuario
├── docker-compose.yml   ← Redis local
├── backend/             ← NestJS + Prisma + BullMQ (Clean Architecture)
│   └── src/
│       ├── controllers/  services/  providers/
│       ├── repositories/ modules/   common/  interfaces/
└── frontend/            ← Next.js 16 App Router
    └── src/
        ├── app/  components/  hooks/  services/  types/  lib/
```

## Convenciones

- TypeScript estricto. **`any` está prohibido** (lo exige `plan.md`).
- Validación de entrada y de env con **Zod** en ambos lados.
- Los proveedores de imagen implementan la interfaz `ImageProvider`; se seleccionan por
  factory a partir de `IMAGE_PROVIDER`. Añadir uno nuevo **no debe** requerir tocar los servicios.
- Nunca exponer claves privadas al frontend: solo `NEXT_PUBLIC_*` cruza al cliente.
- Logging con Pino. Errores de proveedor → excepción de dominio, nunca fuga del error crudo.

## Estado

Leyenda: ✅ hecho · 🚧 en curso · ⬜ pendiente

- ✅ Scaffold del monorepo (npm workspaces + docker-compose para Redis)
- ✅ Esquema Prisma (`prompts`, `generations`, `gallery`) + migración `init` aplicada
- ✅ Interfaz `ImageProvider` + factory + los 5 proveedores
- ✅ Mejorador de prompt (heurístico / OpenAI / Anthropic)
- ✅ Cola BullMQ + worker + subida a Supabase Storage
- ✅ API REST (generar, estado, historial, galería, inspiración, health)
- ✅ UI principal (prompt, estilo, formato, calidad, "Inspirarme")
- ✅ Estados de generación (skeleton, barra de progreso, animaciones)
- ✅ Historial y galería pública con scroll infinito
- ✅ Docs de despliegue (`README.md`)
- ✅ **Verificado de punta a punta contra el Supabase real del usuario**

## Estado del entorno del usuario

Todo listo (2026-07-17). Proyecto Supabase `cxafxjrvjnzibcesmadx`, región `ca-central-1`.

- `backend/.env` relleno y probado. `credenciales.env` es la hoja de trabajo (en `.gitignore`).
- Migración `init` aplicada: las 3 tablas existen en Supabase.
- Bucket `images` creado y **público** (límite 10 MB, solo png/jpeg/webp).

## Qué está verificado

Probado ejecutando el código contra la infraestructura real:

- **Generación completa**: prompt → mejora → Pollinations → Supabase Storage → BD →
  galería. La imagen es accesible públicamente por su URL (HTTP 200, JPEG válido) y
  aparece en la galería y el historial.
- Migración de Prisma contra Supabase; las 3 tablas se crean bien.
- Validación de entorno: rechaza config incompleta y exige la clave del proveedor.
- Endpoints de health, inspiración, galería e historial; errores 400 y 404 con su forma.
- Cola BullMQ con progreso real (30 % → 75 % → 100 %).

### Aviso: Pollinations es irregular

Los tiempos medidos van de **1,3 s a 100 s**. En el peor caso agotó el timeout de 90 s
y solo salió bien el reintento — su servicio gratuito tiene arranques lentos. Funciona,
pero si el día del evento va lento, sube el `timeoutMs` de `pollinations.provider.ts` o
cambia `IMAGE_PROVIDER` a un proveedor de pago.

## Notas para el siguiente agente

### Prisma 7 rompe lo que sabías de Prisma 5/6

La versión instalada es **7.8.0** y cambió cosas de base. Si copias un tutorial antiguo, fallará:

- `url` y `directUrl` **ya no van en `schema.prisma`**. Viven en `prisma.config.ts` (raíz de `backend/`).
  El datasource del schema solo declara `provider`.
- `PrismaClient` **exige un driver adapter**. Se instancia con
  `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })` usando `@prisma/adapter-pg`.
  No acepta una URL directa.
- El generador es `prisma-client` (no `prisma-client-js`) y **requiere `output`**. Sale a
  `src/generated/prisma`, que está en `.gitignore`: hay que correr `npm run db:generate`
  tras clonar o cambiar el schema.
- `prisma.config.ts` no lee `.env` solo: necesita el `import 'dotenv/config'` que ya lleva arriba.
- **`moduleFormat = "cjs"` en el generador no es opcional.** Por defecto emite ESM y usa
  `import.meta.url`, que no se puede transpilar a CommonJS; NestJS compila a CJS, así que
  el proceso muere al arrancar con `ReferenceError: exports is not defined in ES module scope`.
  Si tocas el bloque `generator`, no lo quites.
- **No definas `shadowDatabaseUrl`.** Apuntarlo a la misma base que `url` aborta la
  migración (`the shadow database appears to be the same as the main database`). Prisma
  crea y destruye una base temporal por su cuenta.

### npm 11 bloquea los install scripts

Los postinstall están gateados por `allowScripts`. Si Prisma se queja de engines que faltan, o
sharp no compila, es esto. Se arregla con `npm install-scripts approve <pkg>` y un `npm install`.
Ya están aprobados `@prisma/engines`, `prisma`, `msgpackr-extract`, `unrs-resolver` y `sharp`.

### Migraciones

`prisma.config.ts` apunta a `DIRECT_URL` (puerto 5432) para migrar, porque el pooler de Supabase
(pgbouncer, 6543) no soporta el DDL que Migrate necesita. El cliente en runtime sí usa
`DATABASE_URL` (el pooler).

### Next.js 16

`frontend/AGENTS.md` (lo genera `create-next-app`) avisa de que hay cambios que rompen, y los
docs completos están en `frontend/node_modules/next/dist/docs/` — la guía de la versión está en
`01-app/02-guides/upgrading/version-16.md`. Lo que afecta a este proyecto:

- `images.domains` está deprecado. `next.config.ts` usa `remotePatterns`, con comodín
  `*.supabase.co` para no fijar la referencia del proyecto.
- `params` y `searchParams` son asíncronos y ya no admiten acceso síncrono. Aquí no afecta
  porque las páginas no reciben props de ruta, pero tenlo en cuenta si añades rutas dinámicas.
- Turbopack es el bundler por defecto.

### Supabase: hay que usar el pooler, no la conexión directa

`db.<ref>.supabase.co` **solo resuelve a IPv6**. La red del usuario no tiene salida IPv6
(sin dirección global ni ruta por defecto), así que da `Network is unreachable`. No es
arreglable desde la máquina: depende del ISP. Se usa el pooler, que sí tiene IPv4:

- `DATABASE_URL` → **transaction pooler**, puerto 6543, con `?pgbouncer=true`
  (ese modo no soporta prepared statements).
- `DIRECT_URL` → **session pooler**, puerto 5432. Las migraciones necesitan DDL y el
  transaction pooler no lo soporta.

Ambos en `aws-0-ca-central-1.pooler.supabase.com`. Si alguna vez ves
`Tenant or user not found`, la región del hostname está mal.

### Redis: se comprueba al arrancar, y es a propósito

`main.ts` hace ping a Redis **antes** de crear la app y mata el proceso con un mensaje
accionable si no responde. No lo quites: sin esa comprobación, BullMQ arranca igual y se
queda reintentando en bucle — medimos **342 trazas `ECONNREFUSED` en 45 segundos**, con
el servidor medio vivo (la galería responde, pero no se puede generar nada). El
`retryStrategy` de `app.module.ts` sigue cubriendo los cortes de Redis con la app ya en
marcha; lo de `main.ts` cubre el caso habitual de arrancar el backend suelto sin Redis.

Si arrancas solo el backend, antes lanza `npm run redis:up`. O usa `npm run dev` desde la
raíz, que levanta Redis, backend y frontend.

### Los proveedores mienten sobre las dimensiones

Pollinations devolvió **1015x580** cuando se le pidieron 1344x768 (respeta la proporción,
no el tamaño). Por eso `GenerationService.medirImagen()` lee las dimensiones de los bytes
reales con `image-size` en vez de fiarse de lo que declara el proveedor: si no, la etiqueta
de resolución de la UI mentiría y `next/image` reservaría un hueco equivocado. No lo quites.

### Decisiones de la UI que no son evidentes

- La app es **dark-only**: `class="dark"` fijo en el `<html>` de `layout.tsx`. No hay
  conmutador de tema, así que tampoco hay parpadeo al hidratar.
- El **historial sale del servidor**, no de localStorage: en la Casa Abierta se comparten
  los equipos, y lo interesante es ver lo que acaba de crear la gente que pasó antes.
- **Los likes no tienen control de duplicados.** No hay cuentas de usuario; exigir login
  arruinaría la experiencia y el peor caso es un contador inflado.
- El frontend **hace polling** (1 s) del estado del trabajo. No hay websockets: la cola ya
  desacopla, y el polling sobrevive mejor a una red de recinto inestable.
