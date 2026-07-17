# Proyecto: DreamCanvas AI

Quiero que desarrolles una aplicación web de nivel profesional llamada **DreamCanvas AI**, diseñada para una Casa Abierta del Club de Inteligencia Artificial.

## Objetivo

El usuario escribe una descripción en lenguaje natural y una Inteligencia Artificial genera una imagen de alta calidad en pocos segundos.

Ejemplo:

**Entrada**

> Un gato astronauta comiendo pizza en Marte con estilo Pixar.

**Salida**
Una imagen generada mediante IA lista para descargar.

---

# Stack Tecnológico

## Frontend

* Next.js 16 (App Router)
* React 19
* TypeScript
* Tailwind CSS v4
* shadcn/ui
* Motion
* TanStack Query
* React Hook Form
* Zod
* Lucide Icons

---

## Backend

* NestJS
* TypeScript
* Prisma ORM
* PostgreSQL (Supabase)
* BullMQ
* Redis (Upstash)
* Pino Logger

---

# Base de Datos

Utilizar **Supabase PostgreSQL**.

Modelar correctamente las relaciones.

Tablas sugeridas:

### prompts

* id
* prompt_original
* prompt_mejorado
* estilo
* formato
* calidad
* proveedor
* created_at

---

### generations

* id
* prompt_id
* image_url
* storage_path
* width
* height
* generation_time
* provider_response
* created_at

---

### gallery

* id
* generation_id
* likes
* views
* featured
* created_at

---

# Storage

Utilizar **Supabase Storage**.

Crear un bucket llamado:

images

Las imágenes generadas deben almacenarse automáticamente.

Guardar:

* URL pública
* Path interno
* Fecha
* Tamaño
* Tipo MIME

El usuario debe poder:

* Descargar la imagen
* Compartir la URL
* Abrirla en pantalla completa

---

# Arquitectura

Aplicar Clean Architecture.

backend/

src/

controllers/

services/

providers/

repositories/

modules/

common/

interfaces/

frontend/

app/

components/

hooks/

services/

types/

lib/

---

# Sistema de IA

Crear una interfaz ImageProvider.

Debe ser posible cambiar de proveedor únicamente modificando variables de entorno.

Implementaciones:

* OpenAI GPT Image
* Google Imagen
* FLUX
* Stability AI
* Pollinations.ai

El proveedor activo se define mediante una variable:

IMAGE_PROVIDER=

---

# Mejorador de Prompt

Antes de generar la imagen, utilizar un LLM para mejorar automáticamente el prompt.

Ejemplo:

Entrada

gato astronauta

Salida

An ultra detailed orange cat wearing a NASA astronaut suit floating over Mars while eating a delicious pizza, cinematic lighting, masterpiece, highly detailed, realistic textures, volumetric light, 8k.

Mostrar al usuario:

* Prompt original
* Prompt optimizado

---

# Interfaz

Pantalla principal moderna.

Inspiración:

* Midjourney
* ChatGPT
* Leonardo AI
* Ideogram

Diseño:

* Glassmorphism
* Gradientes
* Fondo animado
* Totalmente responsive
* Dark Mode

---

# Funcionalidades

Pantalla principal con:

* Textarea para prompt
* Selector de estilo

Opciones:

* Realista
* Anime
* Pixar
* Ghibli
* Fantasy
* Cyberpunk
* Digital Art
* 3D Render

Selector de formato:

* 1:1
* 16:9
* 9:16

Selector de calidad:

* Normal
* HD
* Ultra

Checkbox:

Mejorar Prompt automáticamente.

Botón grande:

Generar Imagen

---

# Generación

Al presionar el botón:

Mostrar:

* Skeleton Loader
* Barra de progreso
* Animaciones
* Texto

"La IA está imaginando tu mundo..."

Cuando finalice:

Mostrar la imagen.

Acciones:

* Descargar
* Compartir
* Copiar Prompt
* Regenerar
* Pantalla completa

---

# Historial

Guardar automáticamente las últimas generaciones.

Mostrar:

Miniatura

Prompt

Fecha

Proveedor

Tiempo de generación

---

# Galería

Crear una sección pública.

Mostrar todas las imágenes generadas.

Orden:

Más recientes

Más populares

Aleatorias

---

# Extras

Agregar un botón:

"Inspirarme"

Debe generar prompts aleatorios creativos.

Ejemplos:

* Un dragón hecho de cristal sobre una ciudad futurista.
* Una biblioteca infinita bajo el océano.
* Un panda samurái luchando contra robots.
* Una ciudad flotando entre nubes al atardecer.

---

# Variables de Entorno

Separar correctamente:

Frontend

Backend

Supabase

OpenAI

Redis

Nunca exponer claves privadas.

---

# Código

Requisitos:

* Código limpio.
* Arquitectura modular.
* Componentes reutilizables.
* Sin uso de any.
* Tipado estricto.
* Documentación donde sea necesaria.
* Manejo robusto de errores.
* Validaciones con Zod.
* Buenas prácticas de rendimiento.

---

# Resultado Esperado

El proyecto debe estar listo para producción.

Debe poder desplegarse fácilmente en:

Frontend:

* Vercel

Backend:

* Railway

Base de Datos y Storage:

* Supabase

Redis:

* Upstash

El resultado final debe ser una aplicación moderna, visualmente impactante y preparada para recibir cientos de visitantes durante una Casa Abierta, con una experiencia fluida y profesional.
