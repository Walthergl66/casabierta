-- CreateEnum
CREATE TYPE "Origen" AS ENUM ('TEXTO', 'FOTO');

-- AlterTable
ALTER TABLE "prompts" ADD COLUMN     "origen" "Origen" NOT NULL DEFAULT 'TEXTO';
