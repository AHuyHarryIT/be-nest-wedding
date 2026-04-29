-- Remove Quotations feature tables and enum (safe/idempotent)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='quotation_inventory_items'
  ) THEN
    ALTER TABLE "public"."quotation_inventory_items" DROP CONSTRAINT IF EXISTS "quotation_inventory_items_item_id_fkey";
    ALTER TABLE "public"."quotation_inventory_items" DROP CONSTRAINT IF EXISTS "quotation_inventory_items_quotation_id_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='quotation_services'
  ) THEN
    ALTER TABLE "public"."quotation_services" DROP CONSTRAINT IF EXISTS "quotation_services_quotation_id_fkey";
    ALTER TABLE "public"."quotation_services" DROP CONSTRAINT IF EXISTS "quotation_services_service_id_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='quotations'
  ) THEN
    ALTER TABLE "public"."quotations" DROP CONSTRAINT IF EXISTS "quotations_created_by_id_fkey";
    ALTER TABLE "public"."quotations" DROP CONSTRAINT IF EXISTS "quotations_customer_id_fkey";
  END IF;
END $$;

DROP TABLE IF EXISTS "public"."quotation_inventory_items";
DROP TABLE IF EXISTS "public"."quotation_services";
DROP TABLE IF EXISTS "public"."quotations";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuotationStatus') THEN
    DROP TYPE "public"."QuotationStatus";
  END IF;
END $$;
