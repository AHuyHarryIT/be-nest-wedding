-- Add primary managed job relation to staffs
ALTER TABLE "staffs"
ADD COLUMN IF NOT EXISTS "job_id" TEXT;

CREATE INDEX IF NOT EXISTS "staffs_job_id_idx" ON "staffs"("job_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staffs_job_id_fkey'
  ) THEN
    ALTER TABLE "staffs"
    ADD CONSTRAINT "staffs_job_id_fkey"
    FOREIGN KEY ("job_id") REFERENCES "jobs"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;
