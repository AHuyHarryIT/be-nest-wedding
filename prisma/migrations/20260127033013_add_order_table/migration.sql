/*
  Warnings:

  - You are about to drop the column `bookingId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `depositAmount` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `depositAt` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `depositMethod` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `depositNote` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `depositStatus` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `depositTxnId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `remainingAmount` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `remainingAt` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `remainingMethod` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `remainingNote` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `remainingStatus` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `remainingTxnId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `Payment` table. All the data in the column will be lost.
  - Added the required column `method` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderId` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Payment" DROP CONSTRAINT "Payment_bookingId_fkey";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "bookingId",
DROP COLUMN "depositAmount",
DROP COLUMN "depositAt",
DROP COLUMN "depositMethod",
DROP COLUMN "depositNote",
DROP COLUMN "depositStatus",
DROP COLUMN "depositTxnId",
DROP COLUMN "remainingAmount",
DROP COLUMN "remainingAt",
DROP COLUMN "remainingMethod",
DROP COLUMN "remainingNote",
DROP COLUMN "remainingStatus",
DROP COLUMN "remainingTxnId",
DROP COLUMN "totalAmount",
ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "method" "PaymentMethod" NOT NULL,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "orderId" TEXT NOT NULL,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "txnId" TEXT;

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depositPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "OrderStatus" NOT NULL DEFAULT 'UNPAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_bookingId_idx" ON "Order"("bookingId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
