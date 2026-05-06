-- Remove legacy payment gateway transaction and payment plan structures

-- 1) Remove relation column from payment attempts (if present)
ALTER TABLE "payment_attempts"
  DROP COLUMN IF EXISTS "gateway_transaction_id" CASCADE;

-- 2) Drop removed tables
DROP TABLE IF EXISTS "payment_schedules" CASCADE;
DROP TABLE IF EXISTS "payment_plans" CASCADE;
DROP TABLE IF EXISTS "payment_gateway_transactions" CASCADE;

-- 3) Drop now-unused enums
DROP TYPE IF EXISTS "PaymentPlanType";
DROP TYPE IF EXISTS "PaymentPlanStatus";
DROP TYPE IF EXISTS "PaymentScheduleStatus";
