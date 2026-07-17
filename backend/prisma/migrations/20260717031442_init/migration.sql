-- CreateEnum
CREATE TYPE "Estilo" AS ENUM ('REALISTA', 'ANIME', 'PIXAR', 'GHIBLI', 'FANTASY', 'CYBERPUNK', 'DIGITAL_ART', 'RENDER_3D');

-- CreateEnum
CREATE TYPE "Formato" AS ENUM ('CUADRADO', 'HORIZONTAL', 'VERTICAL');

-- CreateEnum
CREATE TYPE "Calidad" AS ENUM ('NORMAL', 'HD', 'ULTRA');

-- CreateTable
CREATE TABLE "prompts" (
    "id" UUID NOT NULL,
    "prompt_original" TEXT NOT NULL,
    "prompt_mejorado" TEXT,
    "estilo" "Estilo" NOT NULL,
    "formato" "Formato" NOT NULL,
    "calidad" "Calidad" NOT NULL,
    "proveedor" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generations" (
    "id" UUID NOT NULL,
    "prompt_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "mime_type" VARCHAR(50) NOT NULL DEFAULT 'image/png',
    "file_size" INTEGER NOT NULL DEFAULT 0,
    "generation_time" INTEGER NOT NULL,
    "provider_response" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery" (
    "id" UUID NOT NULL,
    "generation_id" UUID NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prompts_created_at_idx" ON "prompts"("created_at" DESC);

-- CreateIndex
CREATE INDEX "generations_prompt_id_idx" ON "generations"("prompt_id");

-- CreateIndex
CREATE INDEX "generations_created_at_idx" ON "generations"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "gallery_generation_id_key" ON "gallery"("generation_id");

-- CreateIndex
CREATE INDEX "gallery_created_at_idx" ON "gallery"("created_at" DESC);

-- CreateIndex
CREATE INDEX "gallery_likes_idx" ON "gallery"("likes" DESC);

-- CreateIndex
CREATE INDEX "gallery_featured_idx" ON "gallery"("featured");

-- AddForeignKey
ALTER TABLE "generations" ADD CONSTRAINT "generations_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery" ADD CONSTRAINT "gallery_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
