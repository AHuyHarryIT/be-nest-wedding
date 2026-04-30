-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('INITIATED', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'TIMEOUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RefundAttemptStatus" AS ENUM ('INITIATED', 'PROCESSING', 'SUCCESS', 'FAILED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "PaymentPlanType" AS ENUM ('ONE_TIME', 'INSTALLMENT_2', 'INSTALLMENT_3', 'INSTALLMENT_6', 'INSTALLMENT_12', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PaymentPlanStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PaymentScheduleStatus" AS ENUM ('PENDING', 'DUE', 'OVERDUE', 'PAID', 'CANCELLED', 'SKIPPED');

-- AlterTable
ALTER TABLE "ai_messages" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ai_threads" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "customer_id" TEXT;

-- AlterTable
ALTER TABLE "staff_chats" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "staff_messages" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "payment_attempts" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'INITIATED',
    "result_code" TEXT,
    "result_message" TEXT,
    "error_reason" TEXT,
    "attempted_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gateway_transaction_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "device_info" TEXT,
    "created_by" TEXT,
    "notes" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "duration" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_gateway_transactions" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "payment_attempt_id" TEXT,
    "gateway_provider" TEXT NOT NULL,
    "gateway_name" TEXT,
    "gateway_transaction_id" TEXT,
    "gateway_order_id" TEXT,
    "gateway_correlation_id" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "gateway_status" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "settled_at" TIMESTAMP(3),
    "webhook_received_at" TIMESTAMP(3),
    "webhook_id" TEXT,
    "webhook_status" TEXT,
    "gateway_request" JSONB,
    "gateway_response" JSONB,
    "notes" TEXT,
    "internal_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_gateway_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_attempts" (
    "id" TEXT NOT NULL,
    "refund_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "RefundAttemptStatus" NOT NULL DEFAULT 'INITIATED',
    "result_code" TEXT,
    "result_message" TEXT,
    "gateway_refund_id" TEXT,
    "notes" TEXT,
    "processed_by" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_plans" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "plan_type" "PaymentPlanType" NOT NULL DEFAULT 'ONE_TIME',
    "installment_count" INTEGER NOT NULL DEFAULT 1,
    "status" "PaymentPlanStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_schedules" (
    "id" TEXT NOT NULL,
    "payment_plan_id" TEXT NOT NULL,
    "schedule_number" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PaymentScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "paid_date" TIMESTAMP(3),
    "reminder_sent_at" TIMESTAMP(3),
    "overdue_reminder_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempts_gateway_transaction_id_key" ON "payment_attempts"("gateway_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempts_idempotency_key_key" ON "payment_attempts"("idempotency_key");

-- CreateIndex
CREATE INDEX "payment_attempts_payment_id_idx" ON "payment_attempts"("payment_id");

-- CreateIndex
CREATE INDEX "payment_attempts_status_idx" ON "payment_attempts"("status");

-- CreateIndex
CREATE INDEX "payment_attempts_gateway_transaction_id_idx" ON "payment_attempts"("gateway_transaction_id");

-- CreateIndex
CREATE INDEX "payment_attempts_requested_at_idx" ON "payment_attempts"("requested_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempts_payment_id_attempt_number_key" ON "payment_attempts"("payment_id", "attempt_number");

-- CreateIndex
CREATE INDEX "payment_gateway_transactions_payment_id_idx" ON "payment_gateway_transactions"("payment_id");

-- CreateIndex
CREATE INDEX "payment_gateway_transactions_gateway_provider_idx" ON "payment_gateway_transactions"("gateway_provider");

-- CreateIndex
CREATE INDEX "payment_gateway_transactions_gateway_transaction_id_idx" ON "payment_gateway_transactions"("gateway_transaction_id");

-- CreateIndex
CREATE INDEX "payment_gateway_transactions_gateway_order_id_idx" ON "payment_gateway_transactions"("gateway_order_id");

-- CreateIndex
CREATE INDEX "payment_gateway_transactions_settled_at_idx" ON "payment_gateway_transactions"("settled_at");

-- CreateIndex
CREATE INDEX "payment_gateway_transactions_webhook_received_at_idx" ON "payment_gateway_transactions"("webhook_received_at");

-- CreateIndex
CREATE INDEX "refund_attempts_refund_id_idx" ON "refund_attempts"("refund_id");

-- CreateIndex
CREATE INDEX "refund_attempts_status_idx" ON "refund_attempts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "refund_attempts_refund_id_attempt_number_key" ON "refund_attempts"("refund_id", "attempt_number");

-- CreateIndex
CREATE INDEX "payment_plans_order_id_idx" ON "payment_plans"("order_id");

-- CreateIndex
CREATE INDEX "payment_plans_status_idx" ON "payment_plans"("status");

-- CreateIndex
CREATE INDEX "payment_schedules_payment_plan_id_idx" ON "payment_schedules"("payment_plan_id");

-- CreateIndex
CREATE INDEX "payment_schedules_due_date_idx" ON "payment_schedules"("due_date");

-- CreateIndex
CREATE INDEX "payment_schedules_status_idx" ON "payment_schedules"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_schedules_payment_plan_id_schedule_number_key" ON "payment_schedules"("payment_plan_id", "schedule_number");

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_gateway_transaction_id_fkey" FOREIGN KEY ("gateway_transaction_id") REFERENCES "payment_gateway_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_gateway_transactions" ADD CONSTRAINT "payment_gateway_transactions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_attempts" ADD CONSTRAINT "refund_attempts_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_plans" ADD CONSTRAINT "payment_plans_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_payment_plan_id_fkey" FOREIGN KEY ("payment_plan_id") REFERENCES "payment_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
