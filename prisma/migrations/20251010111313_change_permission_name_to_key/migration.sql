/*
  Warnings:

  - You are about to drop the column `name` on the `Permission` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[key]` on the table `Permission` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `key` to the `Permission` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Permission_name_key";

-- AlterTable
ALTER TABLE "Permission" DROP COLUMN "name",
ADD COLUMN     "key" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");
