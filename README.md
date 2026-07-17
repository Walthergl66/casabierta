# 🎨 DreamCanvas AI

Escribe una idea en lenguaje natural y una IA la convierte en una imagen de alta calidad
en segundos. Hecho para la Casa Abierta del **Club de Inteligencia Artificial**.

> **Entrada** — _Un gato astronauta comiendo pizza en Marte con estilo Pixar._
> **Salida** — una imagen lista para descargar, compartir y ver a pantalla completa.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui, Motion, TanStack Query, React Hook Form, Zod |
| Backend | NestJS 11, TypeScript, Prisma 7, BullMQ, Pino |
| Datos | Supabase PostgreSQL |
| Almacenamiento | Supabase Storage (bucket `images`) |
| Cola | Redis (local en Docker; Upstash en producción) |
| IA | Pollinations · OpenAI · Google Imagen · FLUX · Stability |

---

## Puesta en marcha

### 1. Requisitos

- Node.js 20 o superior (probado con 24)
- Docker (solo para el Redis local)
- Una cuenta de [Supabase](https://supabase.com) (gratis)

### 2. Instalar

```bash
npm install
```

### 3. Configurar Supabase

En el panel de tu proyecto de Supabase:

1. **Database → Connection string** — copia la cadena del *Connection pooler* (puerto 6543)
   y la de *Direct connection* (puerto 5432).
2. **Storage → New bucket** — crea uno llamado `images` y **márcalo como público**.
   Sin esto las imágenes se suben pero no se pueden ver.
3. **Project Settings → API** — copia la *URL* y la *service_role key*.

Luego rellena los `.env`:

```bash
cp backend/.env.example backend/.env      # pega aquí tus credenciales
cp frontend/.env.example frontend/.env.local
```

> ⚠️ La `service_role key` salta las políticas de seguridad de Supabase.
> Va **solo** en `backend/.env`. Nunca la pongas en el frontend ni la subas a git.

### 4. Crear las tablas

```bash
npm run db:migrate
```

### 5. Arrancar

```bash
npm run dev
```

Levanta Redis en Docker, el backend en `:4000` y el frontend en `:3000`.
Abre **http://localhost:3000**.

---

## Variables de entorno

### Backend (`backend/.env`) — todo secreto

| Variable | Obligatoria | Descripción |
|---|:---:|---|
| `DATABASE_URL` | ✅ | Pooler de Supabase (6543). Lo usa la app en marcha. |
| `DIRECT_URL` | ✅ | Conexión directa (5432). Solo para migraciones. |
| `SUPABASE_URL` | ✅ | `https://[ref].supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **Secreto.** Nunca al navegador. |
| `SUPABASE_STORAGE_BUCKET` | | Por defecto `images`. |
| `REDIS_URL` | ✅ | `redis://localhost:6379` o la URL `rediss://` de Upstash. |
| `IMAGE_PROVIDER` | | `pollinations` (por defecto) · `openai` · `google` · `flux` · `stability` |
| `PROMPT_ENHANCER` | | `none` (por defecto) · `openai` · `anthropic` |
| `OPENAI_API_KEY` etc. | | Solo si activas ese proveedor. |
| `CORS_ORIGIN` | | Origen del frontend. Por defecto `http://localhost:3000`. |

El entorno se valida con Zod al arrancar: si falta algo, el proceso muere al instante con
un mensaje que dice exactamente qué. Si eliges un proveedor de pago sin su API key, también
te lo dice ahí — no cuando ya hay un visitante esperando.

### Frontend (`frontend/.env.local`) — público

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL del backend. Todo lo que lleve `NEXT_PUBLIC_` **viaja al navegador**. |

---

## Cambiar de proveedor de imágenes

Solo se toca el entorno; no hay que modificar código:

```bash
IMAGE_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

Todos implementan la interfaz `ImageProvider` (`backend/src/interfaces/`) y los elige una
factory a partir de la variable. Para añadir uno nuevo: implementa la interfaz, añádelo al
`switch` de `image-provider.factory.ts` y mete su nombre en el enum de `env.ts`.

**Para la Casa Abierta se recomienda `pollinations`**: es gratis y sin API key, así que
cientos de visitantes no agotan ningún crédito. A cambio puede ir lento cuando su servicio
está saturado.

---

## Arquitectura

```
backend/src/
├── controllers/   ← HTTP: rutas y validación con Zod
├── services/      ← lógica de negocio (orquestación)
├── providers/     ← integraciones externas (imagen, LLM)
├── repositories/  ← acceso a datos con Prisma
├── modules/       ← cableado de Nest + worker de la cola
├── interfaces/    ← contratos (ImageProvider, PromptEnhancer)
└── common/        ← entorno, errores, catálogo, filtros

frontend/src/
├── app/           ← rutas del App Router
├── components/    ← componentes de UI
├── hooks/         ← estado de servidor con TanStack Query
├── services/      ← cliente de la API
├── lib/           ← utilidades y catálogo
└── types/         ← contrato con el backend
```

### Cómo se genera una imagen

La generación **no es síncrona**: tarda decenas de segundos y bloquear una petición HTTP
todo ese tiempo no sobrevive a una cola de visitantes.

```
POST /api/generations  →  encola en BullMQ  →  202 { jobId }
                                │
     el frontend sondea         │  el worker (3 en paralelo):
     /status/:jobId cada 1 s    │  1. mejora el prompt con un LLM
                                │  2. genera la imagen
                                │  3. la sube a Supabase Storage
                                │  4. la guarda en BD y la publica en la galería
                                ▼
                        { estado, progreso, resultado }
```

La concurrencia está limitada a 3 a propósito: es mejor que la gente espere unos segundos
a que todas las generaciones fallen a la vez por saturar al proveedor.

---

## Despliegue

### Base de datos y Storage — Supabase

Ya está: usa el mismo proyecto. Ejecuta `npm run db:deploy` contra la base de producción.

### Redis — Upstash

Crea una base en [Upstash](https://upstash.com) y copia la URL `rediss://` a `REDIS_URL`.
El código ya activa TLS solo cuando el protocolo es `rediss:`.

### Backend — Railway

1. Nuevo proyecto → *Deploy from GitHub repo*.
2. **Root directory**: `backend`
3. **Build**: `npm install && npm run build`
4. **Start**: `npm run start:prod`
5. Copia todas las variables de `backend/.env.example`, con los valores de producción.
6. En `CORS_ORIGIN` pon la URL de Vercel (sin barra final).

Health check: `GET /api/health`.

### Frontend — Vercel

1. *Import Git Repository*.
2. **Root directory**: `frontend`
3. Variable de entorno: `NEXT_PUBLIC_API_URL` = la URL pública de Railway.
4. Deploy.

---

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Redis + backend + frontend, todo a la vez |
| `npm run build` | Compila ambos |
| `npm run db:migrate` | Crea y aplica una migración (desarrollo) |
| `npm run db:deploy` | Aplica migraciones (producción) |
| `npm run db:studio` | Abre Prisma Studio |
| `npm run redis:up` / `redis:down` | Solo Redis |

---

## Para agentes de IA

Lee **`AGENTS.md`** antes de tocar nada. Recoge las decisiones tomadas, lo que está
verificado y lo que no, y varias trampas de Prisma 7 y Next.js 16 que te harán perder
una hora si las descubres por tu cuenta.
