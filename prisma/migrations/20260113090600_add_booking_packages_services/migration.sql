-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_packageId_fkey";

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "packageId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "BookingPackage" (
    "bookingId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,

    CONSTRAINT "BookingPackage_pkey" PRIMARY KEY ("bookingId","packageId")
);

-- CreateTable
CREATE TABLE "BookingService" (
    "bookingId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "BookingService_pkey" PRIMARY KEY ("bookingId","serviceId")
);

-- CreateIndex
CREATE INDEX "BookingPackage_packageId_idx" ON "BookingPackage"("packageId");

-- CreateIndex
CREATE INDEX "BookingService_serviceId_idx" ON "BookingService"("serviceId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPackage" ADD CONSTRAINT "BookingPackage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPackage" ADD CONSTRAINT "BookingPackage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
