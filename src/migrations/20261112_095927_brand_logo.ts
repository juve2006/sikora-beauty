import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "pages_blocks_brands" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_brands_locales" (
  	"title" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "brands" ADD COLUMN "logo_id" integer;
  ALTER TABLE "pages_blocks_brands" ADD CONSTRAINT "pages_blocks_brands_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_brands_locales" ADD CONSTRAINT "pages_blocks_brands_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_brands"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_brands_order_idx" ON "pages_blocks_brands" USING btree ("_order");
  CREATE INDEX "pages_blocks_brands_parent_id_idx" ON "pages_blocks_brands" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_brands_path_idx" ON "pages_blocks_brands" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_brands_locales_locale_parent_id_unique" ON "pages_blocks_brands_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_brands_locales_parent_id_idx" ON "pages_blocks_brands_locales" USING btree ("_parent_id");
  ALTER TABLE "brands" ADD CONSTRAINT "brands_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "brands_logo_idx" ON "brands" USING btree ("logo_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_brands" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_brands_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_brands" CASCADE;
  DROP TABLE "pages_blocks_brands_locales" CASCADE;
  ALTER TABLE "brands" DROP CONSTRAINT "brands_logo_id_media_id_fk";
  
  DROP INDEX "brands_logo_idx";
  ALTER TABLE "brands" DROP COLUMN "logo_id";`)
}
