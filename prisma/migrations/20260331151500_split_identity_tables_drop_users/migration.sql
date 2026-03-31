CREATE TABLE "public"."customers" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "email" TEXT,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "refresh_token" TEXT,
    "refresh_token_expiry" TIMESTAMP(3),
    "wedding_date" TIMESTAMP(3),
    "wedding_venue" TEXT,
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "sms_notifications" BOOLEAN NOT NULL DEFAULT true,
    "marketing_emails" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."staff_users" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "email" TEXT,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "refresh_token" TEXT,
    "refresh_token_expiry" TIMESTAMP(3),
    "employee_code" TEXT,
    "department" TEXT,
    "job_title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "staff_users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."staff_user_roles" (
    "staff_user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    CONSTRAINT "staff_user_roles_pkey" PRIMARY KEY ("staff_user_id", "role_id")
);

CREATE UNIQUE INDEX "customers_phone_number_key" ON "public"."customers"("phone_number");
CREATE UNIQUE INDEX "staff_users_phone_number_key" ON "public"."staff_users"("phone_number");
CREATE UNIQUE INDEX "staff_users_employee_code_key" ON "public"."staff_users"("employee_code");
CREATE INDEX "staff_user_roles_role_id_idx" ON "public"."staff_user_roles"("role_id");

INSERT INTO "public"."customers" (
    "id",
    "phone_number",
    "password_hash",
    "first_name",
    "last_name",
    "email",
    "avatar_url",
    "is_active",
    "refresh_token",
    "refresh_token_expiry",
    "created_at",
    "updated_at",
    "deleted_at"
)
SELECT DISTINCT
    u."id",
    u."phone_number",
    u."password_hash",
    u."first_name",
    u."last_name",
    u."email",
    u."avatar_url",
    u."is_active",
    u."refresh_token",
    u."refresh_token_expiry",
    u."created_at",
    u."updated_at",
    u."deleted_at"
FROM "public"."users" u
JOIN "public"."user_roles" ur ON ur."user_id" = u."id"
JOIN "public"."roles" r ON r."id" = ur."role_id"
WHERE r."name" = 'customer';

INSERT INTO "public"."staff_users" (
    "id",
    "phone_number",
    "password_hash",
    "first_name",
    "last_name",
    "email",
    "avatar_url",
    "is_active",
    "refresh_token",
    "refresh_token_expiry",
    "created_at",
    "updated_at",
    "deleted_at"
)
SELECT DISTINCT
    u."id",
    u."phone_number",
    u."password_hash",
    u."first_name",
    u."last_name",
    u."email",
    u."avatar_url",
    u."is_active",
    u."refresh_token",
    u."refresh_token_expiry",
    u."created_at",
    u."updated_at",
    u."deleted_at"
FROM "public"."users" u
JOIN "public"."user_roles" ur ON ur."user_id" = u."id"
JOIN "public"."roles" r ON r."id" = ur."role_id"
WHERE r."name" IN ('super-admin', 'admin', 'manager', 'staff');

INSERT INTO "public"."staff_user_roles" ("staff_user_id", "role_id")
SELECT ur."user_id", ur."role_id"
FROM "public"."user_roles" ur
JOIN "public"."roles" r ON r."id" = ur."role_id"
WHERE r."name" IN ('super-admin', 'admin', 'manager', 'staff');

ALTER TABLE "public"."messages" ADD COLUMN "sender_customer_id" TEXT;
ALTER TABLE "public"."messages" ADD COLUMN "sender_staff_id" TEXT;

UPDATE "public"."messages" m
SET "sender_customer_id" = m."sender_id"
WHERE EXISTS (
    SELECT 1 FROM "public"."customers" c WHERE c."id" = m."sender_id"
);

UPDATE "public"."messages" m
SET "sender_staff_id" = m."sender_id"
WHERE EXISTS (
    SELECT 1 FROM "public"."staff_users" s WHERE s."id" = m."sender_id"
);

ALTER TABLE "public"."albums" RENAME COLUMN "owner_user_id" TO "owner_staff_id";

ALTER TABLE "public"."bookings" DROP CONSTRAINT IF EXISTS "Booking_customerId_fkey";
ALTER TABLE "public"."bookings" DROP CONSTRAINT IF EXISTS "bookings_customer_id_fkey";
ALTER TABLE "public"."session_staffs" DROP CONSTRAINT IF EXISTS "SessionStaff_staffId_fkey";
ALTER TABLE "public"."session_staffs" DROP CONSTRAINT IF EXISTS "session_staffs_staff_id_fkey";
ALTER TABLE "public"."files" DROP CONSTRAINT IF EXISTS "files_uploader_id_fkey";
ALTER TABLE "public"."albums" DROP CONSTRAINT IF EXISTS "albums_owner_user_id_fkey";
ALTER TABLE "public"."chats" DROP CONSTRAINT IF EXISTS "chats_customer_id_fkey";
ALTER TABLE "public"."chats" DROP CONSTRAINT IF EXISTS "chats_staff_id_fkey";
ALTER TABLE "public"."messages" DROP CONSTRAINT IF EXISTS "messages_sender_id_fkey";
ALTER TABLE "public"."user_roles" DROP CONSTRAINT IF EXISTS "UserRole_userId_fkey";
ALTER TABLE "public"."user_roles" DROP CONSTRAINT IF EXISTS "user_roles_user_id_fkey";

ALTER TABLE "public"."bookings"
ADD CONSTRAINT "bookings_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."session_staffs"
ADD CONSTRAINT "session_staffs_staff_id_fkey"
FOREIGN KEY ("staff_id") REFERENCES "public"."staff_users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."files"
ADD CONSTRAINT "files_uploader_id_fkey"
FOREIGN KEY ("uploader_id") REFERENCES "public"."staff_users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."albums"
ADD CONSTRAINT "albums_owner_staff_id_fkey"
FOREIGN KEY ("owner_staff_id") REFERENCES "public"."staff_users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."chats"
ADD CONSTRAINT "chats_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."chats"
ADD CONSTRAINT "chats_staff_id_fkey"
FOREIGN KEY ("staff_id") REFERENCES "public"."staff_users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."messages"
ADD CONSTRAINT "messages_sender_customer_id_fkey"
FOREIGN KEY ("sender_customer_id") REFERENCES "public"."customers"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."messages"
ADD CONSTRAINT "messages_sender_staff_id_fkey"
FOREIGN KEY ("sender_staff_id") REFERENCES "public"."staff_users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."staff_user_roles"
ADD CONSTRAINT "staff_user_roles_staff_user_id_fkey"
FOREIGN KEY ("staff_user_id") REFERENCES "public"."staff_users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."staff_user_roles"
ADD CONSTRAINT "staff_user_roles_role_id_fkey"
FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "messages_senderId_idx";
CREATE INDEX "messages_sender_customer_id_idx" ON "public"."messages"("sender_customer_id");
CREATE INDEX "messages_sender_staff_id_idx" ON "public"."messages"("sender_staff_id");

ALTER TABLE "public"."messages" DROP COLUMN "sender_id";
DROP TABLE "public"."user_roles";
DROP TABLE "public"."users";
