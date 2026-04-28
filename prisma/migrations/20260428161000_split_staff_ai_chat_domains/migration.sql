-- Split legacy chat domain into staff chat and AI chat domains.
-- Forward-only migration: create new enums/tables and backfill from chats/messages.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'StaffMessageSenderType'
  ) THEN
    CREATE TYPE "StaffMessageSenderType" AS ENUM ('CUSTOMER', 'STAFF');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'AiMessageSenderType'
  ) THEN
    CREATE TYPE "AiMessageSenderType" AS ENUM ('CUSTOMER', 'AI');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "staff_chats" (
  "id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "staff_id" TEXT,
  "booking_id" TEXT,
  "canonical_thread_key" TEXT NOT NULL,
  "last_message_at" TIMESTAMP(3),
  "is_archived" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "staff_chats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "staff_messages" (
  "id" TEXT NOT NULL,
  "staff_chat_id" TEXT NOT NULL,
  "sender_type" "StaffMessageSenderType" NOT NULL DEFAULT 'CUSTOMER',
  "sender_customer_id" TEXT,
  "sender_staff_id" TEXT,
  "content" TEXT NOT NULL,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "staff_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ai_threads" (
  "id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "booking_id" TEXT,
  "canonical_thread_key" TEXT NOT NULL,
  "last_message_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "ai_threads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ai_messages" (
  "id" TEXT NOT NULL,
  "ai_thread_id" TEXT NOT NULL,
  "sender_type" "AiMessageSenderType" NOT NULL DEFAULT 'CUSTOMER',
  "sender_customer_id" TEXT,
  "content" TEXT NOT NULL,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_chats_customer_id_fkey'
  ) THEN
    ALTER TABLE "staff_chats"
      ADD CONSTRAINT "staff_chats_customer_id_fkey"
      FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_chats_staff_id_fkey'
  ) THEN
    ALTER TABLE "staff_chats"
      ADD CONSTRAINT "staff_chats_staff_id_fkey"
      FOREIGN KEY ("staff_id") REFERENCES "staffs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_chats_booking_id_fkey'
  ) THEN
    ALTER TABLE "staff_chats"
      ADD CONSTRAINT "staff_chats_booking_id_fkey"
      FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_messages_staff_chat_id_fkey'
  ) THEN
    ALTER TABLE "staff_messages"
      ADD CONSTRAINT "staff_messages_staff_chat_id_fkey"
      FOREIGN KEY ("staff_chat_id") REFERENCES "staff_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_messages_sender_customer_id_fkey'
  ) THEN
    ALTER TABLE "staff_messages"
      ADD CONSTRAINT "staff_messages_sender_customer_id_fkey"
      FOREIGN KEY ("sender_customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_messages_sender_staff_id_fkey'
  ) THEN
    ALTER TABLE "staff_messages"
      ADD CONSTRAINT "staff_messages_sender_staff_id_fkey"
      FOREIGN KEY ("sender_staff_id") REFERENCES "staffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ai_threads_customer_id_fkey'
  ) THEN
    ALTER TABLE "ai_threads"
      ADD CONSTRAINT "ai_threads_customer_id_fkey"
      FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ai_threads_booking_id_fkey'
  ) THEN
    ALTER TABLE "ai_threads"
      ADD CONSTRAINT "ai_threads_booking_id_fkey"
      FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ai_messages_ai_thread_id_fkey'
  ) THEN
    ALTER TABLE "ai_messages"
      ADD CONSTRAINT "ai_messages_ai_thread_id_fkey"
      FOREIGN KEY ("ai_thread_id") REFERENCES "ai_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ai_messages_sender_customer_id_fkey'
  ) THEN
    ALTER TABLE "ai_messages"
      ADD CONSTRAINT "ai_messages_sender_customer_id_fkey"
      FOREIGN KEY ("sender_customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "staff_chats_canonical_thread_key_key"
  ON "staff_chats"("canonical_thread_key");
CREATE UNIQUE INDEX IF NOT EXISTS "ai_threads_canonical_thread_key_key"
  ON "ai_threads"("canonical_thread_key");

CREATE INDEX IF NOT EXISTS "staff_chats_customer_id_staff_id_idx"
  ON "staff_chats"("customer_id", "staff_id");
CREATE INDEX IF NOT EXISTS "staff_chats_booking_id_idx"
  ON "staff_chats"("booking_id");
CREATE INDEX IF NOT EXISTS "staff_chats_last_message_at_idx"
  ON "staff_chats"("last_message_at");
CREATE INDEX IF NOT EXISTS "staff_chats_canonical_thread_key_idx"
  ON "staff_chats"("canonical_thread_key");

CREATE INDEX IF NOT EXISTS "staff_messages_staff_chat_id_created_at_idx"
  ON "staff_messages"("staff_chat_id", "created_at");
CREATE INDEX IF NOT EXISTS "staff_messages_sender_customer_id_idx"
  ON "staff_messages"("sender_customer_id");
CREATE INDEX IF NOT EXISTS "staff_messages_sender_staff_id_idx"
  ON "staff_messages"("sender_staff_id");
CREATE INDEX IF NOT EXISTS "staff_messages_is_read_idx"
  ON "staff_messages"("is_read");

CREATE INDEX IF NOT EXISTS "ai_threads_customer_id_idx"
  ON "ai_threads"("customer_id");
CREATE INDEX IF NOT EXISTS "ai_threads_booking_id_idx"
  ON "ai_threads"("booking_id");
CREATE INDEX IF NOT EXISTS "ai_threads_last_message_at_idx"
  ON "ai_threads"("last_message_at");
CREATE INDEX IF NOT EXISTS "ai_threads_canonical_thread_key_idx"
  ON "ai_threads"("canonical_thread_key");

CREATE INDEX IF NOT EXISTS "ai_messages_ai_thread_id_created_at_idx"
  ON "ai_messages"("ai_thread_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_messages_sender_customer_id_idx"
  ON "ai_messages"("sender_customer_id");
CREATE INDEX IF NOT EXISTS "ai_messages_is_read_idx"
  ON "ai_messages"("is_read");

-- Backfill staff chats from legacy non-AI chats.
WITH staff_chat_source AS (
  SELECT
    c."id",
    c."customer_id",
    c."staff_id",
    c."booking_id",
    COALESCE(NULLIF(c."canonical_thread_key", ''),
      CASE
        WHEN c."booking_id" IS NOT NULL THEN 'booking:' || c."customer_id" || ':' || c."booking_id"
        ELSE 'general:' || c."customer_id"
      END
    ) AS base_key,
    c."last_message_at",
    c."is_archived",
    c."created_at",
    c."updated_at",
    c."deleted_at",
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(NULLIF(c."canonical_thread_key", ''),
        CASE
          WHEN c."booking_id" IS NOT NULL THEN 'booking:' || c."customer_id" || ':' || c."booking_id"
          ELSE 'general:' || c."customer_id"
        END
      )
      ORDER BY c."created_at" ASC, c."id" ASC
    ) AS row_num
  FROM "chats" c
  WHERE c."ai_enabled" = FALSE
),
staff_chat_insert AS (
  SELECT
    s."id",
    s."customer_id",
    s."staff_id",
    s."booking_id",
    CASE
      WHEN s.row_num = 1 THEN 'staff:' || s.base_key
      ELSE 'staff:' || s.base_key || ':dup:' || s."id"
    END AS canonical_thread_key,
    s."last_message_at",
    s."is_archived",
    s."created_at",
    s."updated_at",
    s."deleted_at"
  FROM staff_chat_source s
)
INSERT INTO "staff_chats" (
  "id",
  "customer_id",
  "staff_id",
  "booking_id",
  "canonical_thread_key",
  "last_message_at",
  "is_archived",
  "created_at",
  "updated_at",
  "deleted_at"
)
SELECT
  s."id",
  s."customer_id",
  s."staff_id",
  s."booking_id",
  s."canonical_thread_key",
  s."last_message_at",
  s."is_archived",
  s."created_at",
  s."updated_at",
  s."deleted_at"
FROM staff_chat_insert s
ON CONFLICT ("id") DO NOTHING;

-- Backfill AI threads from legacy AI-enabled chats.
WITH ai_thread_source AS (
  SELECT
    c."id",
    c."customer_id",
    c."booking_id",
    COALESCE(NULLIF(c."canonical_thread_key", ''),
      CASE
        WHEN c."booking_id" IS NOT NULL THEN 'booking:' || c."customer_id" || ':' || c."booking_id"
        ELSE 'general:' || c."customer_id"
      END
    ) AS base_key,
    c."last_message_at",
    c."created_at",
    c."updated_at",
    c."deleted_at",
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(NULLIF(c."canonical_thread_key", ''),
        CASE
          WHEN c."booking_id" IS NOT NULL THEN 'booking:' || c."customer_id" || ':' || c."booking_id"
          ELSE 'general:' || c."customer_id"
        END
      )
      ORDER BY c."created_at" ASC, c."id" ASC
    ) AS row_num
  FROM "chats" c
  WHERE c."ai_enabled" = TRUE
),
ai_thread_insert AS (
  SELECT
    a."id",
    a."customer_id",
    a."booking_id",
    CASE
      WHEN a.row_num = 1 THEN 'ai:' || a.base_key
      ELSE 'ai:' || a.base_key || ':dup:' || a."id"
    END AS canonical_thread_key,
    a."last_message_at",
    a."created_at",
    a."updated_at",
    a."deleted_at"
  FROM ai_thread_source a
)
INSERT INTO "ai_threads" (
  "id",
  "customer_id",
  "booking_id",
  "canonical_thread_key",
  "last_message_at",
  "created_at",
  "updated_at",
  "deleted_at"
)
SELECT
  a."id",
  a."customer_id",
  a."booking_id",
  a."canonical_thread_key",
  a."last_message_at",
  a."created_at",
  a."updated_at",
  a."deleted_at"
FROM ai_thread_insert a
ON CONFLICT ("id") DO NOTHING;

-- Backfill staff messages from legacy messages belonging to non-AI chats.
INSERT INTO "staff_messages" (
  "id",
  "staff_chat_id",
  "sender_type",
  "sender_customer_id",
  "sender_staff_id",
  "content",
  "is_read",
  "read_at",
  "created_at",
  "updated_at"
)
SELECT
  m."id",
  m."chat_id",
  CASE
    WHEN m."sender_type" = 'STAFF'::"MessageSenderType" THEN 'STAFF'::"StaffMessageSenderType"
    ELSE 'CUSTOMER'::"StaffMessageSenderType"
  END,
  CASE
    WHEN m."sender_type" = 'CUSTOMER'::"MessageSenderType" THEN m."sender_customer_id"
    ELSE NULL
  END,
  CASE
    WHEN m."sender_type" = 'STAFF'::"MessageSenderType" THEN m."sender_staff_id"
    ELSE NULL
  END,
  m."content",
  m."is_read",
  m."read_at",
  m."created_at",
  m."updated_at"
FROM "messages" m
JOIN "chats" c ON c."id" = m."chat_id"
WHERE c."ai_enabled" = FALSE
ON CONFLICT ("id") DO NOTHING;

-- Backfill AI messages from legacy messages belonging to AI-enabled chats.
INSERT INTO "ai_messages" (
  "id",
  "ai_thread_id",
  "sender_type",
  "sender_customer_id",
  "content",
  "is_read",
  "read_at",
  "created_at",
  "updated_at"
)
SELECT
  m."id",
  m."chat_id",
  CASE
    WHEN m."sender_type" = 'CUSTOMER'::"MessageSenderType" THEN 'CUSTOMER'::"AiMessageSenderType"
    ELSE 'AI'::"AiMessageSenderType"
  END,
  CASE
    WHEN m."sender_type" = 'CUSTOMER'::"MessageSenderType" THEN m."sender_customer_id"
    ELSE NULL
  END,
  m."content",
  m."is_read",
  m."read_at",
  m."created_at",
  m."updated_at"
FROM "messages" m
JOIN "chats" c ON c."id" = m."chat_id"
WHERE c."ai_enabled" = TRUE
ON CONFLICT ("id") DO NOTHING;
