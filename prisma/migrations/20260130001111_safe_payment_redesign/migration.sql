/*
  Safe migration for payment system redesign
  - Adds new tables first (no data loss)
  - Preserves existing data
  - Prepares Order and Payment tables for transition
*/

-- Step 1: Create new enums
CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'REMAINING', 'INSTALLMENT', 'FULL', 'ADJUSTMENT');
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('INITIATED', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'TIMEOUT', 'CANCELLED');
CREATE TYPE "RefundReason" AS ENUM ('CUSTOMER_REQUEST', 'OVERPAYMENT', 'CANCELLATION', 'ERROR', 'DUPLICATE', 'FRAUD_SUSPECTED', 'OTHER');
CREATE TYPE "RefundStatus" AS ENUM ('INITIATED', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'REJECTED', 'PENDING_REVERIFICATION');
CREATE TYPE "RefundAttemptStatus" AS ENUM ('INITIATED', 'PROCESSING', 'SUCCESS', 'FAILED', 'TIMEOUT');
CREATE TYPE "PaymentPlanType" AS ENUM ('ONE_TIME', 'INSTALLMENT_2', 'INSTALLMENT_3', 'INSTALLMENT_6', 'INSTALLMENT_12', 'CUSTOM');
CREATE TYPE "PaymentPlanStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'SUSPENDED');
CREATE TYPE "PaymentScheduleStatus" AS ENUM ('PENDING', 'DUE', 'OVERDUE', 'PAID', 'CANCELLED', 'SKIPPED');

-- Step 2: Add new statuses to PaymentStatus enum
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIAL_PAID';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'ABANDONED';

-- Step 3: Add new columns to Order as nullable first
ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "id" TEXT,
ADD COLUMN IF NOT EXISTS "referenceNumber" TEXT,
ADD COLUMN IF NOT EXISTS "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "totalRefunded" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "balanceRemaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "notes" TEXT,
ADD COLUMN IF NOT EXISTS "internalNotes" TEXT,
ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT,
ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);

-- Step 4: Populate id and referenceNumber for existing Order records
UPDATE "Order"
SET 
  "id" = COALESCE("id", gen_random_uuid()::text),
  "referenceNumber" = COALESCE("referenceNumber", 'ORD-' || SUBSTRING(CAST("bookingId" AS text), 1, 8) || '-' || EXTRACT(EPOCH FROM "createdAt")::bigint % 1000000)
WHERE "id" IS NULL OR "referenceNumber" IS NULL;

-- Step 5: Update balances for existing orders based on payments
UPDATE "Order" o
SET "totalPaid" = COALESCE((
  SELECT SUM(amount) FROM "Payment" p 
  WHERE p."bookingId" = o."bookingId" AND p.status = 'SUCCESSFUL'
), 0),
"balanceRemaining" = o."totalPrice" - COALESCE((
  SELECT SUM(amount) FROM "Payment" p 
  WHERE p."bookingId" = o."bookingId" AND p.status = 'SUCCESSFUL'
), 0)
WHERE "totalPaid" = 0;

-- Step 6: Add new columns to Payment table
ALTER TABLE "Payment"
ADD COLUMN IF NOT EXISTS "orderId" TEXT,
ADD COLUMN IF NOT EXISTS "paymentSequence" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "paymentType" "PaymentType" NOT NULL DEFAULT 'REMAINING',
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "successfulAttemptId" TEXT,
ADD COLUMN IF NOT EXISTS "notes" TEXT,
ADD COLUMN IF NOT EXISTS "internalNotes" TEXT,
ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;

-- Step 7: Populate orderId from existing Order table
UPDATE "Payment" p
SET "orderId" = o."id"
FROM "Order" o
WHERE p."bookingId" = o."bookingId" AND p."orderId" IS NULL;

-- Step 8: Populate description based on payment type
UPDATE "Payment"
SET "description" = CASE 
  WHEN amount <= 0.30 * (SELECT "totalPrice" FROM "Order" WHERE id = "orderId") THEN 'Deposit payment'
  ELSE 'Remaining balance payment'
END,
"lastAttemptAt" = "createdAt",
"attemptCount" = 1
WHERE "description" IS NULL;

-- Step 9: Create new PaymentAttempt table
CREATE TABLE IF NOT EXISTS "PaymentAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'INITIATED',
    "resultCode" TEXT,
    "resultMessage" TEXT,
    "errorReason" TEXT,
    "attemptedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gatewayTransactionId" TEXT,
    "idempotencyKey" TEXT NOT NULL UNIQUE,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "deviceInfo" TEXT,
    "createdBy" TEXT,
    "notes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Step 10: Create indexes for PaymentAttempt
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentAttempt_paymentId_attemptNumber_key" ON "PaymentAttempt"("paymentId", "attemptNumber");
CREATE INDEX IF NOT EXISTS "PaymentAttempt_paymentId_idx" ON "PaymentAttempt"("paymentId");
CREATE INDEX IF NOT EXISTS "PaymentAttempt_status_idx" ON "PaymentAttempt"("status");
CREATE INDEX IF NOT EXISTS "PaymentAttempt_requestedAt_idx" ON "PaymentAttempt"("requestedAt");

-- Step 11: Create PaymentGatewayTransaction table
CREATE TABLE IF NOT EXISTS "PaymentGatewayTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "paymentAttemptId" TEXT,
    "gatewayProvider" TEXT NOT NULL,
    "gatewayName" TEXT,
    "gatewayTransactionId" TEXT,
    "gatewayOrderId" TEXT,
    "gatewayCorrelationId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "gatewayStatus" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "webhookReceivedAt" TIMESTAMP(3),
    "webhookId" TEXT,
    "webhookStatus" TEXT,
    "gatewayRequest" JSONB,
    "gatewayResponse" JSONB,
    "notes" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Step 12: Create indexes for PaymentGatewayTransaction
CREATE INDEX IF NOT EXISTS "PaymentGatewayTransaction_paymentId_idx" ON "PaymentGatewayTransaction"("paymentId");
CREATE INDEX IF NOT EXISTS "PaymentGatewayTransaction_gatewayProvider_idx" ON "PaymentGatewayTransaction"("gatewayProvider");
CREATE INDEX IF NOT EXISTS "PaymentGatewayTransaction_gatewayTransactionId_idx" ON "PaymentGatewayTransaction"("gatewayTransactionId");
CREATE INDEX IF NOT EXISTS "PaymentGatewayTransaction_gatewayOrderId_idx" ON "PaymentGatewayTransaction"("gatewayOrderId");
CREATE INDEX IF NOT EXISTS "PaymentGatewayTransaction_settledAt_idx" ON "PaymentGatewayTransaction"("settledAt");
CREATE INDEX IF NOT EXISTS "PaymentGatewayTransaction_webhookReceivedAt_idx" ON "PaymentGatewayTransaction"("webhookReceivedAt");

-- Step 13: Create Refund table
CREATE TABLE IF NOT EXISTS "Refund" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "refundSequence" INTEGER NOT NULL DEFAULT 1,
    "referenceNumber" TEXT NOT NULL UNIQUE,
    "originalPaymentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" "RefundReason" NOT NULL DEFAULT 'CUSTOMER_REQUEST',
    "description" TEXT,
    "status" "RefundStatus" NOT NULL DEFAULT 'INITIATED',
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "authorizedBy" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Step 14: Create indexes for Refund
CREATE UNIQUE INDEX IF NOT EXISTS "Refund_orderId_refundSequence_key" ON "Refund"("orderId", "refundSequence");
CREATE INDEX IF NOT EXISTS "Refund_orderId_idx" ON "Refund"("orderId");
CREATE INDEX IF NOT EXISTS "Refund_status_idx" ON "Refund"("status");
CREATE INDEX IF NOT EXISTS "Refund_createdAt_idx" ON "Refund"("createdAt");

-- Step 15: Create RefundAttempt table
CREATE TABLE IF NOT EXISTS "RefundAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "refundId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "RefundAttemptStatus" NOT NULL DEFAULT 'INITIATED',
    "resultCode" TEXT,
    "resultMessage" TEXT,
    "gatewayRefundId" TEXT,
    "notes" TEXT,
    "processedBy" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Step 16: Create indexes for RefundAttempt
CREATE UNIQUE INDEX IF NOT EXISTS "RefundAttempt_refundId_attemptNumber_key" ON "RefundAttempt"("refundId", "attemptNumber");
CREATE INDEX IF NOT EXISTS "RefundAttempt_refundId_idx" ON "RefundAttempt"("refundId");
CREATE INDEX IF NOT EXISTS "RefundAttempt_status_idx" ON "RefundAttempt"("status");

-- Step 17: Create PaymentPlan table
CREATE TABLE IF NOT EXISTS "PaymentPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "planType" "PaymentPlanType" NOT NULL DEFAULT 'ONE_TIME',
    "installmentCount" INTEGER NOT NULL DEFAULT 1,
    "status" "PaymentPlanStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Step 18: Create indexes for PaymentPlan
CREATE INDEX IF NOT EXISTS "PaymentPlan_orderId_idx" ON "PaymentPlan"("orderId");
CREATE INDEX IF NOT EXISTS "PaymentPlan_status_idx" ON "PaymentPlan"("status");

-- Step 19: Create PaymentSchedule table
CREATE TABLE IF NOT EXISTS "PaymentSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentPlanId" TEXT NOT NULL,
    "scheduleNumber" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PaymentScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "paidDate" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "overdueReminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Step 20: Create indexes for PaymentSchedule
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentSchedule_paymentPlanId_scheduleNumber_key" ON "PaymentSchedule"("paymentPlanId", "scheduleNumber");
CREATE INDEX IF NOT EXISTS "PaymentSchedule_paymentPlanId_idx" ON "PaymentSchedule"("paymentPlanId");
CREATE INDEX IF NOT EXISTS "PaymentSchedule_dueDate_idx" ON "PaymentSchedule"("dueDate");
CREATE INDEX IF NOT EXISTS "PaymentSchedule_status_idx" ON "PaymentSchedule"("status");

-- Step 21: Migrate existing Payment txnId to PaymentGatewayTransaction
INSERT INTO "PaymentGatewayTransaction" (
  id, "paymentId", "gatewayProvider", "gatewayTransactionId", amount, 
  "gatewayStatus", "requestedAt", "respondedAt", "settledAt", 
  "gatewayResponse", "createdAt", "updatedAt"
)
SELECT 
  gen_random_uuid()::text, id, 'momo', "txnId", amount,
  CASE WHEN status = 'SUCCESSFUL' THEN '0' ELSE 'FAILED' END,
  "createdAt", "paidAt", CASE WHEN status = 'SUCCESSFUL' THEN "paidAt" END,
  jsonb_build_object('legacyMigration', true, 'originalTxnId', "txnId"),
  NOW(), NOW()
FROM "Payment"
WHERE "txnId" IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM "PaymentGatewayTransaction" pgt 
  WHERE pgt."paymentId" = "Payment".id
)
ON CONFLICT DO NOTHING;

-- Step 22: Migrate existing Payment data to PaymentAttempt
INSERT INTO "PaymentAttempt" (
  id, "paymentId", "attemptNumber", status, 
  "attemptedAmount", "idempotencyKey", "requestedAt", 
  "respondedAt", "createdAt", "updatedAt"
)
SELECT 
  gen_random_uuid()::text, id, 1,
  CASE WHEN status = 'SUCCESSFUL' THEN 'SUCCESS'::"PaymentAttemptStatus"
       WHEN status = 'FAILED' THEN 'FAILED'::"PaymentAttemptStatus"
       WHEN status = 'PENDING' THEN 'IN_PROGRESS'::"PaymentAttemptStatus"
       ELSE 'INITIATED'::"PaymentAttemptStatus" END,
  amount, 
  'legacy_' || id || '_' || EXTRACT(EPOCH FROM NOW())::text,
  "createdAt", "paidAt", NOW(), NOW()
FROM "Payment"
WHERE NOT EXISTS (
  SELECT 1 FROM "PaymentAttempt" pa 
  WHERE pa."paymentId" = "Payment".id
)
ON CONFLICT DO NOTHING;

-- Step 23: Update Payment.successfulAttemptId for successful payments
UPDATE "Payment" p
SET "successfulAttemptId" = (
  SELECT pa.id FROM "PaymentAttempt" pa 
  WHERE pa."paymentId" = p.id AND pa.status = 'SUCCESS'
  LIMIT 1
)
WHERE status = 'SUCCESSFUL' AND "successfulAttemptId" IS NULL;
