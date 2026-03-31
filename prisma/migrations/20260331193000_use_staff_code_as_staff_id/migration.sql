ALTER TABLE "public"."staffs" ALTER COLUMN "id" DROP DEFAULT;

UPDATE "public"."staffs"
SET "employee_code" = CONCAT(
  'STF-',
  UPPER(SUBSTRING(REPLACE("id", '-', '') FROM 1 FOR 8))
)
WHERE "employee_code" IS NULL OR BTRIM("employee_code") = '';

UPDATE "public"."staffs"
SET "id" = "employee_code";

ALTER TABLE "public"."staffs" DROP COLUMN "employee_code";
