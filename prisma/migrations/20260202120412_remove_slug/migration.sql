/*
  Warnings:

  - You are about to drop the column `slug` on the `packages` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `services` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."packages_slug_key";

-- DropIndex
DROP INDEX "public"."services_slug_key";

-- AlterTable
ALTER TABLE "packages" DROP COLUMN "slug";

-- AlterTable
ALTER TABLE "services" DROP COLUMN "slug";
