/*
  Warnings:

  - You are about to drop the column `packageId` on the `Booking` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_packageId_fkey";

-- DropIndex
DROP INDEX "public"."Booking_customerId_packageId_status_createdAt_idx";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "packageId";

-- CreateIndex
CREATE INDEX "Booking_customerId_status_createdAt_idx" ON "Booking"("customerId", "status", "createdAt");
