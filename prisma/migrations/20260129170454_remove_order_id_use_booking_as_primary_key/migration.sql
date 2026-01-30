-- Migration: Remove Order.id and use bookingId as PRIMARY KEY
-- This migration refactors the Order model to use bookingId as the sole unique identifier

-- Step 1: Drop the existing Payment foreign key constraint
ALTER TABLE "public"."Payment" DROP CONSTRAINT "Payment_orderId_fkey";

-- Step 2: Drop existing indexes
DROP INDEX IF EXISTS "public"."Order_bookingId_idx";
DROP INDEX IF EXISTS "public"."Payment_orderId_idx";

-- Step 3: Create temporary table to backup Order data
CREATE TEMPORARY TABLE order_backup AS
SELECT * FROM "Order";

-- Step 4: Create temporary table to backup Payment data with mapping
CREATE TEMPORARY TABLE payment_backup AS
SELECT p."id", p."orderId", o."bookingId", p."amount", p."method", p."status", p."txnId", p."note", p."paidAt", p."createdAt", p."updatedAt", p."deletedAt"
FROM "Payment" p
JOIN "Order" o ON p."orderId" = o."id";

-- Step 5: Drop and recreate Order table with new schema
-- First, drop the Payment table (child)
DROP TABLE "public"."Payment";

-- Drop the Order table
DROP TABLE "public"."Order";

-- Recreate Order table with bookingId as PRIMARY KEY
CREATE TABLE "public"."Order" (
    "bookingId" TEXT NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depositPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("bookingId")
);

-- Recreate Payment table with bookingId foreign key
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "txnId" TEXT,
    "note" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- Step 6: Restore Order data
INSERT INTO "public"."Order" ("bookingId", "totalPrice", "depositAmount", "remainingAmount", "depositPaid", "remainingPaid", "status", "createdAt", "updatedAt", "deletedAt")
SELECT o."bookingId", o."totalPrice", o."depositAmount", o."remainingAmount", o."depositPaid", o."remainingPaid", o."status", o."createdAt", o."updatedAt", o."deletedAt"
FROM order_backup o;

-- Step 7: Restore Payment data with correct bookingId
INSERT INTO "public"."Payment" ("id", "bookingId", "amount", "method", "status", "txnId", "note", "paidAt", "createdAt", "updatedAt", "deletedAt")
SELECT p."id", p."bookingId", p."amount", p."method", p."status", p."txnId", p."note", p."paidAt", p."createdAt", p."updatedAt", p."deletedAt"
FROM payment_backup p;

-- Step 8: Create indexes
CREATE INDEX "Order_status_idx" ON "public"."Order"("status");
CREATE INDEX "Payment_bookingId_idx" ON "public"."Payment"("bookingId");
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");

-- Step 9: Add foreign key constraints
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Order"("bookingId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 10: Add constraint to ensure Order references a valid Booking
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
