import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_consultation_requests_locale" AS ENUM('uk', 'en');
  CREATE TYPE "public"."enum_consultation_requests_status" AS ENUM('new', 'in_progress', 'closed');
  CREATE TABLE "consultation_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"message" varchar,
  	"product_id" integer,
  	"locale" "enum_consultation_requests_locale",
  	"status" "enum_consultation_requests_status" DEFAULT 'new' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "consultation_requests_id" integer;
  ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "consultation_requests_product_idx" ON "consultation_requests" USING btree ("product_id");
  CREATE INDEX "consultation_requests_updated_at_idx" ON "consultation_requests" USING btree ("updated_at");
  CREATE INDEX "consultation_requests_created_at_idx" ON "consultation_requests" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_consultation_requests_fk" FOREIGN KEY ("consultation_requests_id") REFERENCES "public"."consultation_requests"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_consultation_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("consultation_requests_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "consultation_requests" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "consultation_requests" CASCADE;
  
  DROP INDEX "payload_locked_documents_rels_consultation_requests_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "consultation_requests_id";
  DROP TYPE "public"."enum_consultation_requests_locale";
  DROP TYPE "public"."enum_consultation_requests_status";`)
}
