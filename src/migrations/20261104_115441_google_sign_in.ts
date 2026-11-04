import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "customers" ALTER COLUMN "first_name" DROP NOT NULL;
  ALTER TABLE "customers" ALTER COLUMN "last_name" DROP NOT NULL;
  ALTER TABLE "customers" ADD COLUMN "google_id" varchar;
  CREATE UNIQUE INDEX "customers_google_id_idx" ON "customers" USING btree ("google_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "customers_google_id_idx";
  UPDATE "customers" SET "first_name" = '' WHERE "first_name" IS NULL;
  UPDATE "customers" SET "last_name" = '' WHERE "last_name" IS NULL;
  ALTER TABLE "customers" ALTER COLUMN "first_name" SET NOT NULL;
  ALTER TABLE "customers" ALTER COLUMN "last_name" SET NOT NULL;
  ALTER TABLE "customers" DROP COLUMN "google_id";`)
}
