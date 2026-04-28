-- Reconcile chat AI persistence fields with current Prisma schema.
-- Forward-only migration: add missing columns/type, backfill data, and enforce constraints.

-- Create enum for message sender type if it does not already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'MessageSenderType'
  ) THEN
    CREATE TYPE "MessageSenderType" AS ENUM ('CUSTOMER', 'STAFF', 'AI');
  END IF;
END
$$;

-- Add missing chat-level AI/thread columns.
ALTER TABLE "chats"
  ADD COLUMN IF NOT EXISTS "canonical_thread_key" TEXT,
  ADD COLUMN IF NOT EXISTS "ai_enabled" BOOLEAN;

-- Add missing message sender type column.
ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "sender_type" "MessageSenderType";

-- Backfill canonical thread key deterministically from existing identifiers.
WITH ranked_chats AS (
  SELECT
    c."id",
    CASE
      WHEN c."booking_id" IS NOT NULL THEN 'booking:' || c."customer_id" || ':' || c."booking_id"
      ELSE 'general:' || c."customer_id"
    END AS base_key,
    ROW_NUMBER() OVER (
      PARTITION BY
        CASE
          WHEN c."booking_id" IS NOT NULL THEN 'booking:' || c."customer_id" || ':' || c."booking_id"
          ELSE 'general:' || c."customer_id"
        END
      ORDER BY c."created_at" ASC, c."id" ASC
    ) AS row_num
  FROM "chats" c
)
UPDATE "chats" c
SET "canonical_thread_key" = CASE
  WHEN r.row_num = 1 THEN r.base_key
  ELSE r.base_key || ':dup:' || c."id"
END
FROM ranked_chats r
WHERE c."id" = r."id"
  AND (
    c."canonical_thread_key" IS NULL
    OR c."canonical_thread_key" = ''
  );

-- De-duplicate any pre-existing canonical thread keys (defensive).
WITH ranked_existing_keys AS (
  SELECT
    c."id",
    c."canonical_thread_key",
    ROW_NUMBER() OVER (
      PARTITION BY c."canonical_thread_key"
      ORDER BY c."created_at" ASC, c."id" ASC
    ) AS row_num
  FROM "chats" c
  WHERE c."canonical_thread_key" IS NOT NULL
    AND c."canonical_thread_key" <> ''
)
UPDATE "chats" c
SET "canonical_thread_key" = r."canonical_thread_key" || ':dup:' || c."id"
FROM ranked_existing_keys r
WHERE c."id" = r."id"
  AND r.row_num > 1;

-- Backfill ai_enabled for existing chats.
UPDATE "chats"
SET "ai_enabled" = TRUE
WHERE "ai_enabled" IS NULL;

-- Backfill sender_type from existing sender FK columns.
UPDATE "messages" m
SET "sender_type" = CASE
  WHEN m."sender_customer_id" IS NOT NULL AND m."sender_staff_id" IS NULL THEN 'CUSTOMER'::"MessageSenderType"
  WHEN m."sender_staff_id" IS NOT NULL AND m."sender_customer_id" IS NULL THEN 'STAFF'::"MessageSenderType"
  WHEN m."sender_customer_id" IS NULL AND m."sender_staff_id" IS NULL THEN 'AI'::"MessageSenderType"
  WHEN m."sender_customer_id" = c."customer_id" THEN 'CUSTOMER'::"MessageSenderType"
  WHEN m."sender_staff_id" = c."staff_id" THEN 'STAFF'::"MessageSenderType"
  ELSE 'AI'::"MessageSenderType"
END
FROM "chats" c
WHERE m."chat_id" = c."id"
  AND m."sender_type" IS NULL;

-- If any rows still lack sender_type (defensive fallback), set to AI.
UPDATE "messages"
SET "sender_type" = 'AI'::"MessageSenderType"
WHERE "sender_type" IS NULL;

-- Normalize sender FK columns to align with sender_type semantics.
UPDATE "messages"
SET "sender_staff_id" = NULL
WHERE "sender_type" = 'CUSTOMER'::"MessageSenderType";

UPDATE "messages"
SET "sender_customer_id" = NULL
WHERE "sender_type" = 'STAFF'::"MessageSenderType";

UPDATE "messages"
SET
  "sender_customer_id" = NULL,
  "sender_staff_id" = NULL
WHERE "sender_type" = 'AI'::"MessageSenderType";

-- Enforce required defaults/nullability.
ALTER TABLE "chats"
  ALTER COLUMN "canonical_thread_key" SET NOT NULL,
  ALTER COLUMN "ai_enabled" SET DEFAULT TRUE,
  ALTER COLUMN "ai_enabled" SET NOT NULL;

ALTER TABLE "messages"
  ALTER COLUMN "sender_type" SET DEFAULT 'CUSTOMER'::"MessageSenderType",
  ALTER COLUMN "sender_type" SET NOT NULL;

-- Add/ensure unique constraint for canonical thread key.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chats_canonical_thread_key_key'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_class
    WHERE relname = 'chats_canonical_thread_key_key'
  ) THEN
    ALTER TABLE "chats"
      ADD CONSTRAINT "chats_canonical_thread_key_key" UNIQUE ("canonical_thread_key");
  END IF;
END
$$;

-- Preserve explicit secondary index declared in Prisma schema.
CREATE INDEX IF NOT EXISTS "chats_canonical_thread_key_idx"
  ON "chats"("canonical_thread_key");

-- Enforce sender-type consistency with sender FK columns.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'messages_sender_type_customer_check'
  ) THEN
    ALTER TABLE "messages"
      ADD CONSTRAINT "messages_sender_type_customer_check"
      CHECK (
        "sender_type" <> 'CUSTOMER'::"MessageSenderType"
        OR (
          "sender_customer_id" IS NOT NULL
          AND "sender_staff_id" IS NULL
        )
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'messages_sender_type_staff_check'
  ) THEN
    ALTER TABLE "messages"
      ADD CONSTRAINT "messages_sender_type_staff_check"
      CHECK (
        "sender_type" <> 'STAFF'::"MessageSenderType"
        OR (
          "sender_staff_id" IS NOT NULL
          AND "sender_customer_id" IS NULL
        )
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'messages_sender_type_ai_check'
  ) THEN
    ALTER TABLE "messages"
      ADD CONSTRAINT "messages_sender_type_ai_check"
      CHECK (
        "sender_type" <> 'AI'::"MessageSenderType"
        OR (
          "sender_customer_id" IS NULL
          AND "sender_staff_id" IS NULL
        )
      ) NOT VALID;
  END IF;
END
$$;

-- Defensive re-normalization for legacy inconsistent rows before validating checks.
UPDATE "messages"
SET
  "sender_type" = 'CUSTOMER'::"MessageSenderType",
  "sender_staff_id" = NULL
WHERE "sender_customer_id" IS NOT NULL
  AND "sender_staff_id" IS NULL
  AND "sender_type" <> 'CUSTOMER'::"MessageSenderType";

UPDATE "messages"
SET
  "sender_type" = 'STAFF'::"MessageSenderType",
  "sender_customer_id" = NULL
WHERE "sender_staff_id" IS NOT NULL
  AND "sender_customer_id" IS NULL
  AND "sender_type" <> 'STAFF'::"MessageSenderType";

UPDATE "messages"
SET
  "sender_type" = 'AI'::"MessageSenderType",
  "sender_customer_id" = NULL,
  "sender_staff_id" = NULL
WHERE ("sender_customer_id" IS NULL AND "sender_staff_id" IS NULL)
  AND "sender_type" <> 'AI'::"MessageSenderType";

UPDATE "messages" m
SET
  "sender_type" = CASE
    WHEN c."staff_id" IS NOT NULL AND m."sender_staff_id" = c."staff_id" THEN 'STAFF'::"MessageSenderType"
    WHEN m."sender_customer_id" = c."customer_id" THEN 'CUSTOMER'::"MessageSenderType"
    ELSE 'AI'::"MessageSenderType"
  END,
  "sender_customer_id" = CASE
    WHEN m."sender_customer_id" = c."customer_id" THEN m."sender_customer_id"
    ELSE NULL
  END,
  "sender_staff_id" = CASE
    WHEN c."staff_id" IS NOT NULL AND m."sender_staff_id" = c."staff_id" THEN m."sender_staff_id"
    ELSE NULL
  END
FROM "chats" c
WHERE m."chat_id" = c."id"
  AND m."sender_customer_id" IS NOT NULL
  AND m."sender_staff_id" IS NOT NULL;

ALTER TABLE "messages" VALIDATE CONSTRAINT "messages_sender_type_customer_check";
ALTER TABLE "messages" VALIDATE CONSTRAINT "messages_sender_type_staff_check";
ALTER TABLE "messages" VALIDATE CONSTRAINT "messages_sender_type_ai_check";
