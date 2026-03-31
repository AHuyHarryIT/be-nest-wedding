ALTER TABLE "public"."staff_users" RENAME TO "staffs";

ALTER TABLE "public"."staffs" RENAME CONSTRAINT "staff_users_pkey" TO "staffs_pkey";
ALTER INDEX "public"."staff_users_phone_number_key" RENAME TO "staffs_phone_number_key";
ALTER INDEX "public"."staff_users_employee_code_key" RENAME TO "staffs_employee_code_key";
