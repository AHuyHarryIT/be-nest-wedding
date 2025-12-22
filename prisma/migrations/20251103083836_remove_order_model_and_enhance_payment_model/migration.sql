/*
  Warnings:

  - You are about to drop the column `amount` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `method` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `orderId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `paidAt` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `providerTxnId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the `Order` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Payment" DROP CONSTRAINT "Payment_orderId_fkey";

-- DropIndex
DROP INDEX "public"."Payment_orderId_idx";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "amount",
DROP COLUMN "method",
DROP COLUMN "orderId",
DROP COLUMN "paidAt",
DROP COLUMN "providerTxnId",
DROP COLUMN "status",
ADD COLUMN     "bookingId" TEXT,
ADD COLUMN     "depositAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "depositAt" TIMESTAMP(3),
ADD COLUMN     "depositMethod" "PaymentMethod",
ADD COLUMN     "depositNote" TEXT,
ADD COLUMN     "depositStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "depositTxnId" TEXT,
ADD COLUMN     "remainingAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "remainingAt" TIMESTAMP(3),
ADD COLUMN     "remainingMethod" "PaymentMethod",
ADD COLUMN     "remainingNote" TEXT,
ADD COLUMN     "remainingStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "remainingTxnId" TEXT,
ADD COLUMN     "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "public"."Order";

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
