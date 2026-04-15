CREATE TABLE "public_inquiries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "phone" TEXT,
    "package_interest" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_inquiries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "public_inquiries_email_idx" ON "public_inquiries"("email");
CREATE INDEX "public_inquiries_created_at_idx" ON "public_inquiries"("created_at");
