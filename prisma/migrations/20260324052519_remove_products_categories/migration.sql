/*
  Warnings:

  - You are about to drop the `categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inventory_reservations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `products` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."inventory_reservations" DROP CONSTRAINT "inventory_reservations_product_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."inventory_reservations" DROP CONSTRAINT "inventory_reservations_session_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."products" DROP CONSTRAINT "products_category_id_fkey";

-- DropTable
DROP TABLE "public"."categories";

-- DropTable
DROP TABLE "public"."inventory_reservations";

-- DropTable
DROP TABLE "public"."products";
