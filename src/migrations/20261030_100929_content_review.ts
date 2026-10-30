import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// The default is set after the column is added: existing products keep no status rather than
// «Перевірено», which nobody gave them — an imported draft among them was never read.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_review" AS ENUM('ai', 'imported', 'reviewed');
  CREATE TYPE "public"."enum__products_v_version_review" AS ENUM('ai', 'imported', 'reviewed');
  ALTER TABLE "products" ADD COLUMN "review" "enum_products_review";
  ALTER TABLE "products" ALTER COLUMN "review" SET DEFAULT 'reviewed';
  ALTER TABLE "_products_v" ADD COLUMN "version_review" "enum__products_v_version_review";
  ALTER TABLE "_products_v" ALTER COLUMN "version_review" SET DEFAULT 'reviewed';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" DROP COLUMN "review";
  ALTER TABLE "_products_v" DROP COLUMN "version_review";
  DROP TYPE "public"."enum_products_review";
  DROP TYPE "public"."enum__products_v_version_review";`)
}
