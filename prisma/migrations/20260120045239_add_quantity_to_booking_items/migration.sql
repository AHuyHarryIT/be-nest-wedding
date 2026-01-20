-- AlterTable
ALTER TABLE "BookingPackage" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "BookingService" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;
