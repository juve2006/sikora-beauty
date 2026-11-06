import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_orders_payment" ADD VALUE 'card';
  ALTER TYPE "public"."enum_orders_payment_status" ADD VALUE 'failed';
  ALTER TYPE "public"."enum_orders_payment_status" ADD VALUE 'refunded';
  ALTER TABLE "orders" ADD COLUMN "mono_invoice_id" varchar;
  CREATE UNIQUE INDEX "orders_mono_invoice_id_idx" ON "orders" USING btree ("mono_invoice_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" ALTER COLUMN "payment" SET DATA TYPE text;
  DROP TYPE "public"."enum_orders_payment";
  CREATE TYPE "public"."enum_orders_payment" AS ENUM('cod', 'link', 'transfer');
  ALTER TABLE "orders" ALTER COLUMN "payment" SET DATA TYPE "public"."enum_orders_payment" USING "payment"::"public"."enum_orders_payment";
  ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DATA TYPE text;
  ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DEFAULT 'awaiting'::text;
  DROP TYPE "public"."enum_orders_payment_status";
  CREATE TYPE "public"."enum_orders_payment_status" AS ENUM('awaiting', 'paid');
  ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DEFAULT 'awaiting'::"public"."enum_orders_payment_status";
  ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DATA TYPE "public"."enum_orders_payment_status" USING "payment_status"::"public"."enum_orders_payment_status";
  DROP INDEX "orders_mono_invoice_id_idx";
  ALTER TABLE "orders" DROP COLUMN "mono_invoice_id";`)
}
