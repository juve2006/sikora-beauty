import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_orders_payment_status" AS ENUM('awaiting', 'paid');
  ALTER TYPE "public"."enum_orders_payment" ADD VALUE 'transfer';
  CREATE TABLE "payment_details" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"recipient" varchar,
  	"iban" varchar,
  	"code" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "orders" ADD COLUMN "payment_status" "enum_orders_payment_status" DEFAULT 'awaiting' NOT NULL;
  ALTER TABLE "orders" ADD COLUMN "return_token" varchar;
  CREATE UNIQUE INDEX "orders_return_token_idx" ON "orders" USING btree ("return_token");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payment_details" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payment_details" CASCADE;
  ALTER TABLE "orders" ALTER COLUMN "payment" SET DATA TYPE text;
  DROP TYPE "public"."enum_orders_payment";
  CREATE TYPE "public"."enum_orders_payment" AS ENUM('cod', 'link');
  ALTER TABLE "orders" ALTER COLUMN "payment" SET DATA TYPE "public"."enum_orders_payment" USING "payment"::"public"."enum_orders_payment";
  DROP INDEX "orders_return_token_idx";
  ALTER TABLE "orders" DROP COLUMN "payment_status";
  ALTER TABLE "orders" DROP COLUMN "return_token";
  DROP TYPE "public"."enum_orders_payment_status";`)
}
