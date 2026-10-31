import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_search_misses_locale" AS ENUM('uk', 'en');
  CREATE TABLE "search_synonyms" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"spellings" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "search_misses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"query" varchar NOT NULL,
  	"count" numeric NOT NULL,
  	"locale" "enum_search_misses_locale" NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "search_synonyms_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "search_misses_id" integer;
  CREATE INDEX "search_synonyms_updated_at_idx" ON "search_synonyms" USING btree ("updated_at");
  CREATE INDEX "search_synonyms_created_at_idx" ON "search_synonyms" USING btree ("created_at");
  CREATE UNIQUE INDEX "search_misses_query_idx" ON "search_misses" USING btree ("query");
  CREATE INDEX "search_misses_updated_at_idx" ON "search_misses" USING btree ("updated_at");
  CREATE INDEX "search_misses_created_at_idx" ON "search_misses" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_search_synonyms_fk" FOREIGN KEY ("search_synonyms_id") REFERENCES "public"."search_synonyms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_search_misses_fk" FOREIGN KEY ("search_misses_id") REFERENCES "public"."search_misses"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_search_synonyms_id_idx" ON "payload_locked_documents_rels" USING btree ("search_synonyms_id");
  CREATE INDEX "payload_locked_documents_rels_search_misses_id_idx" ON "payload_locked_documents_rels" USING btree ("search_misses_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "search_synonyms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "search_misses" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "search_synonyms" CASCADE;
  DROP TABLE "search_misses" CASCADE;
  DROP INDEX "payload_locked_documents_rels_search_synonyms_id_idx";
  DROP INDEX "payload_locked_documents_rels_search_misses_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "search_synonyms_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "search_misses_id";
  DROP TYPE "public"."enum_search_misses_locale";`)
}
