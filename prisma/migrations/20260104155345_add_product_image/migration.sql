/*
  Warnings:

  - You are about to drop the column `checksum` on the `File` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."File_checksum_key";

-- AlterTable
ALTER TABLE "File" DROP COLUMN "checksum";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "imageUrl" TEXT;
