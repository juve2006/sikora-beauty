import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" ALTER COLUMN "volume_unit" SET DEFAULT 'pcs';
  ALTER TABLE "_products_v" ALTER COLUMN "version_volume_unit" SET DEFAULT 'pcs';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" ALTER COLUMN "volume_unit" DROP DEFAULT;
  ALTER TABLE "_products_v" ALTER COLUMN "version_volume_unit" DROP DEFAULT;`)
}
