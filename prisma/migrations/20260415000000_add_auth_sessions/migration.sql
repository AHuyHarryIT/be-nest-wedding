CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "customer_id" TEXT,
    "staff_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions"("token_hash");
CREATE INDEX "auth_sessions_customer_id_idx" ON "auth_sessions"("customer_id");
CREATE INDEX "auth_sessions_staff_id_idx" ON "auth_sessions"("staff_id");
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");
CREATE INDEX "auth_sessions_revoked_at_idx" ON "auth_sessions"("revoked_at");

ALTER TABLE "auth_sessions"
ADD CONSTRAINT "auth_sessions_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth_sessions"
ADD CONSTRAINT "auth_sessions_staff_id_fkey"
FOREIGN KEY ("staff_id") REFERENCES "staffs"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
