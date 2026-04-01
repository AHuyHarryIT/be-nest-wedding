ALTER TABLE "booking_staffs"
ADD COLUMN "source_key" TEXT,
ADD COLUMN "service_label" TEXT;

UPDATE "booking_staffs"
SET "source_key" = CONCAT('staff:', "staff_id")
WHERE "source_key" IS NULL;

ALTER TABLE "booking_staffs"
ALTER COLUMN "source_key" SET NOT NULL;

ALTER TABLE "booking_staffs" DROP CONSTRAINT "booking_staffs_pkey";

ALTER TABLE "booking_staffs"
ADD CONSTRAINT "booking_staffs_pkey" PRIMARY KEY ("booking_id", "source_key");
