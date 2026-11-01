import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_orders_lines_availability" AS ENUM('in_stock', 'made_to_order', 'out_of_stock');
  CREATE TYPE "public"."enum_orders_payment" AS ENUM('cod', 'link');
  CREATE TYPE "public"."enum_orders_locale" AS ENUM('uk', 'en');
  CREATE TYPE "public"."enum_orders_status" AS ENUM('new', 'confirmed', 'shipped', 'completed', 'cancelled');
  CREATE TABLE "orders_lines" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"brand" varchar,
  	"volume" varchar,
  	"price" numeric NOT NULL,
  	"quantity" numeric NOT NULL,
  	"availability" "enum_orders_lines_availability",
  	"made_to_order_days" numeric,
  	"product_id" integer
  );
  
  CREATE TABLE "orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"total" numeric NOT NULL,
  	"first_name" varchar NOT NULL,
  	"last_name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"settlement" varchar NOT NULL,
  	"warehouse" varchar NOT NULL,
  	"settlement_ref" varchar,
  	"warehouse_ref" varchar,
  	"payment" "enum_orders_payment" NOT NULL,
  	"comment" varchar,
  	"locale" "enum_orders_locale",
  	"status" "enum_orders_status" DEFAULT 'new' NOT NULL,
  	"manager_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "orders_id" integer;
  ALTER TABLE "orders_lines" ADD CONSTRAINT "orders_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_lines" ADD CONSTRAINT "orders_lines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "orders_lines_order_idx" ON "orders_lines" USING btree ("_order");
  CREATE INDEX "orders_lines_parent_id_idx" ON "orders_lines" USING btree ("_parent_id");
  CREATE INDEX "orders_lines_product_idx" ON "orders_lines" USING btree ("product_id");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders_lines" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "orders_lines" CASCADE;
  DROP TABLE "orders" CASCADE;
  DROP INDEX "payload_locked_documents_rels_orders_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "orders_id";
  DROP TYPE "public"."enum_orders_lines_availability";
  DROP TYPE "public"."enum_orders_payment";
  DROP TYPE "public"."enum_orders_locale";
  DROP TYPE "public"."enum_orders_status";`)
}
