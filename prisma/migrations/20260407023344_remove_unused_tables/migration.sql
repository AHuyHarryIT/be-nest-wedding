/*
  Warnings:

  - You are about to drop the `payment_attempts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payment_gateway_transactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payment_plans` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payment_schedules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `quotation_inventory_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `quotation_services` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `quotations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `refund_attempts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."payment_attempts" DROP CONSTRAINT "payment_attempts_gateway_transaction_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."payment_attempts" DROP CONSTRAINT "payment_attempts_payment_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."payment_gateway_transactions" DROP CONSTRAINT "payment_gateway_transactions_payment_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."payment_plans" DROP CONSTRAINT "payment_plans_order_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."payment_schedules" DROP CONSTRAINT "payment_schedules_payment_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."quotation_inventory_items" DROP CONSTRAINT "quotation_inventory_items_item_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."quotation_inventory_items" DROP CONSTRAINT "quotation_inventory_items_quotation_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."quotation_services" DROP CONSTRAINT "quotation_services_quotation_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."quotation_services" DROP CONSTRAINT "quotation_services_service_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."quotations" DROP CONSTRAINT "quotations_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."quotations" DROP CONSTRAINT "quotations_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."refund_attempts" DROP CONSTRAINT "refund_attempts_refund_id_fkey";

-- DropTable
DROP TABLE "public"."payment_attempts";

-- DropTable
DROP TABLE "public"."payment_gateway_transactions";

-- DropTable
DROP TABLE "public"."payment_plans";

-- DropTable
DROP TABLE "public"."payment_schedules";

-- DropTable
DROP TABLE "public"."quotation_inventory_items";

-- DropTable
DROP TABLE "public"."quotation_services";

-- DropTable
DROP TABLE "public"."quotations";

-- DropTable
DROP TABLE "public"."refund_attempts";

-- DropEnum
DROP TYPE "public"."PaymentAttemptStatus";

-- DropEnum
DROP TYPE "public"."PaymentPlanStatus";

-- DropEnum
DROP TYPE "public"."PaymentPlanType";

-- DropEnum
DROP TYPE "public"."PaymentScheduleStatus";

-- DropEnum
DROP TYPE "public"."QuotationStatus";

-- DropEnum
DROP TYPE "public"."RefundAttemptStatus";
