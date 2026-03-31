ALTER TABLE "services"
ADD COLUMN "job_id" TEXT;

CREATE INDEX "services_job_id_idx" ON "services"("job_id");

ALTER TABLE "services"
ADD CONSTRAINT "services_job_id_fkey"
FOREIGN KEY ("job_id") REFERENCES "jobs"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
