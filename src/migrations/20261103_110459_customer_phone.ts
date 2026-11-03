import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// A number is now a way in, looked up as +380… and one account's. Until now the admin took anything:
// what `accountPhone` would not read goes, and of a number written twice a confirmed account keeps it,
// then the oldest.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   UPDATE "customers" SET "phone" = CASE
     WHEN regexp_replace("phone", '[[:space:] ().-]', '', 'g') ~ '^(([+]?38)?0)?[0-9]{9}$'
     THEN '+380' || right(regexp_replace("phone", '[[:space:] ().-]', '', 'g'), 9)
   END
   WHERE "phone" IS NOT NULL;
   UPDATE "customers" AS "later" SET "phone" = NULL
     FROM "customers" AS "earlier"
     WHERE "later"."phone" = "earlier"."phone"
       AND (NOT coalesce("earlier"."_verified", false), "earlier"."created_at", "earlier"."id")
         < (NOT coalesce("later"."_verified", false), "later"."created_at", "later"."id");
   CREATE UNIQUE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");`)
}

// The numbers stay as `up` left them: what it cleared is gone.
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "customers_phone_idx";`)
}
