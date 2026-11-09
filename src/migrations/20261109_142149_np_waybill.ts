import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" ADD COLUMN "waybill_number" varchar;
  ALTER TABLE "orders" ADD COLUMN "waybill_requested_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "delivery_code" varchar;
  ALTER TABLE "orders" ADD COLUMN "delivery_status" varchar;
  CREATE UNIQUE INDEX "orders_waybill_number_idx" ON "orders" USING btree ("waybill_number");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "orders_waybill_number_idx";
  ALTER TABLE "orders" DROP COLUMN "waybill_number";
  ALTER TABLE "orders" DROP COLUMN "waybill_requested_at";
  ALTER TABLE "orders" DROP COLUMN "delivery_code";
  ALTER TABLE "orders" DROP COLUMN "delivery_status";`)
}
