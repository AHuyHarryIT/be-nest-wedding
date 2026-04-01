ALTER TABLE "booking_staffs"
ADD COLUMN "start_time" TEXT,
ADD COLUMN "end_time" TEXT;

UPDATE "booking_staffs"
SET "start_time" = "service_time"
WHERE "service_time" IS NOT NULL;

ALTER TABLE "booking_staffs"
DROP COLUMN IF EXISTS "service_time";
