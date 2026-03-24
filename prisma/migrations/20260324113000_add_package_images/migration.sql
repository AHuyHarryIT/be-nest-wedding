-- Add cover image columns directly on packages
ALTER TABLE "packages"
  ADD COLUMN "cover_image_url" TEXT,
  ADD COLUMN "cover_image_public_id" TEXT;

-- Ordered gallery images for each package
CREATE TABLE "package_images" (
  "id" TEXT NOT NULL,
  "package_id" TEXT NOT NULL,
  "image_url" TEXT NOT NULL,
  "cloudinary_public_id" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "package_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "package_images_package_id_sort_order_idx"
  ON "package_images"("package_id", "sort_order");

ALTER TABLE "package_images"
  ADD CONSTRAINT "package_images_package_id_fkey"
  FOREIGN KEY ("package_id") REFERENCES "packages"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
