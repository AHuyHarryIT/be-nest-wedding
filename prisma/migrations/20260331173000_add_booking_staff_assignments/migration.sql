CREATE TABLE "public"."booking_staffs" (
    "booking_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_staffs_pkey" PRIMARY KEY ("booking_id","staff_id")
);

CREATE INDEX "booking_staffs_staff_id_idx" ON "public"."booking_staffs"("staff_id");

ALTER TABLE "public"."booking_staffs"
ADD CONSTRAINT "booking_staffs_booking_id_fkey"
FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."booking_staffs"
ADD CONSTRAINT "booking_staffs_staff_id_fkey"
FOREIGN KEY ("staff_id") REFERENCES "public"."staffs"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
