-- Backfill the staff primary job relation into the new many-to-many join table.
CREATE TABLE IF NOT EXISTS "staff_jobs" (
  "staff_id" TEXT NOT NULL,
  "job_id" TEXT NOT NULL,
  CONSTRAINT "staff_jobs_pkey" PRIMARY KEY ("staff_id", "job_id")
);

INSERT INTO "staff_jobs" ("staff_id", "job_id")
SELECT "id", "job_id"
FROM "staffs"
WHERE "job_id" IS NOT NULL
ON CONFLICT ("staff_id", "job_id") DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_jobs_staff_id_fkey'
  ) THEN
    ALTER TABLE "staff_jobs"
      ADD CONSTRAINT "staff_jobs_staff_id_fkey"
      FOREIGN KEY ("staff_id") REFERENCES "staffs"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_jobs_job_id_fkey'
  ) THEN
    ALTER TABLE "staff_jobs"
      ADD CONSTRAINT "staff_jobs_job_id_fkey"
      FOREIGN KEY ("job_id") REFERENCES "jobs"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "staff_jobs_job_id_idx" ON "staff_jobs"("job_id");

ALTER TABLE "staffs" DROP CONSTRAINT IF EXISTS "staffs_job_id_fkey";
ALTER TABLE "staffs" DROP COLUMN IF EXISTS "job_id";
