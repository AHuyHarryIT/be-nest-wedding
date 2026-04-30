-- DropForeignKey
ALTER TABLE "public"."booking_inventory_items" DROP CONSTRAINT "booking_inventory_items_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."booking_inventory_items" DROP CONSTRAINT "booking_inventory_items_item_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."inventory_items" DROP CONSTRAINT "inventory_items_category_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."inventory_logs" DROP CONSTRAINT "inventory_logs_actor_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."inventory_logs" DROP CONSTRAINT "inventory_logs_item_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."notifications" DROP CONSTRAINT "notifications_reminder_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."reminders" DROP CONSTRAINT "reminders_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."reminders" DROP CONSTRAINT "reminders_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."reminders" DROP CONSTRAINT "reminders_item_id_fkey";

-- DropTable
DROP TABLE "public"."booking_inventory_items";

-- DropTable
DROP TABLE "public"."inventory_categories";

-- DropTable
DROP TABLE "public"."inventory_items";

-- DropTable
DROP TABLE "public"."inventory_logs";

-- DropTable
DROP TABLE "public"."notifications";

-- DropTable
DROP TABLE "public"."reminders";

-- DropEnum
DROP TYPE "public"."InventoryLogType";

-- DropEnum
DROP TYPE "public"."ItemType";

-- DropEnum
DROP TYPE "public"."NotificationChannel";

-- DropEnum
DROP TYPE "public"."ReminderStatus";

-- DropEnum
DROP TYPE "public"."ReminderType";

-- DropEnum
DROP TYPE "public"."RentalStatus";

