ALTER TABLE "public"."staff_user_roles" RENAME TO "staff_roles";

ALTER TABLE "public"."staff_roles" RENAME CONSTRAINT "staff_user_roles_pkey" TO "staff_roles_pkey";
ALTER INDEX "public"."staff_user_roles_role_id_idx" RENAME TO "staff_roles_role_id_idx";
ALTER TABLE "public"."staff_roles" RENAME CONSTRAINT "staff_user_roles_staff_user_id_fkey" TO "staff_roles_staff_id_fkey";
ALTER TABLE "public"."staff_roles" RENAME CONSTRAINT "staff_user_roles_role_id_fkey" TO "staff_roles_role_id_fkey";
