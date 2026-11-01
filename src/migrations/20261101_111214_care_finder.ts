import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "care_finder_questions_answers" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "care_finder_questions_answers_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "care_finder_questions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"multiple" boolean
  );
  
  CREATE TABLE "care_finder_questions_locales" (
  	"question" varchar NOT NULL,
  	"hint" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "care_finder_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "care_finder_steps_locales" (
  	"title" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "care_finder" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"enabled" boolean,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "care_finder_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"skin_types_id" integer,
  	"skin_conditions_id" integer,
  	"skin_concerns_id" integer,
  	"categories_id" integer
  );
  
  ALTER TABLE "consultation_requests" ADD COLUMN "finder_answers" varchar;
  ALTER TABLE "care_finder_questions_answers" ADD CONSTRAINT "care_finder_questions_answers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."care_finder_questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "care_finder_questions_answers_locales" ADD CONSTRAINT "care_finder_questions_answers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."care_finder_questions_answers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "care_finder_questions" ADD CONSTRAINT "care_finder_questions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."care_finder"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "care_finder_questions_locales" ADD CONSTRAINT "care_finder_questions_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."care_finder_questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "care_finder_steps" ADD CONSTRAINT "care_finder_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."care_finder"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "care_finder_steps_locales" ADD CONSTRAINT "care_finder_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."care_finder_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "care_finder_rels" ADD CONSTRAINT "care_finder_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."care_finder"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "care_finder_rels" ADD CONSTRAINT "care_finder_rels_skin_types_fk" FOREIGN KEY ("skin_types_id") REFERENCES "public"."skin_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "care_finder_rels" ADD CONSTRAINT "care_finder_rels_skin_conditions_fk" FOREIGN KEY ("skin_conditions_id") REFERENCES "public"."skin_conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "care_finder_rels" ADD CONSTRAINT "care_finder_rels_skin_concerns_fk" FOREIGN KEY ("skin_concerns_id") REFERENCES "public"."skin_concerns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "care_finder_rels" ADD CONSTRAINT "care_finder_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "care_finder_questions_answers_order_idx" ON "care_finder_questions_answers" USING btree ("_order");
  CREATE INDEX "care_finder_questions_answers_parent_id_idx" ON "care_finder_questions_answers" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "care_finder_questions_answers_locales_locale_parent_id_uniqu" ON "care_finder_questions_answers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "care_finder_questions_answers_locales_parent_id_idx" ON "care_finder_questions_answers_locales" USING btree ("_parent_id");
  CREATE INDEX "care_finder_questions_order_idx" ON "care_finder_questions" USING btree ("_order");
  CREATE INDEX "care_finder_questions_parent_id_idx" ON "care_finder_questions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "care_finder_questions_locales_locale_parent_id_unique" ON "care_finder_questions_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "care_finder_questions_locales_parent_id_idx" ON "care_finder_questions_locales" USING btree ("_parent_id");
  CREATE INDEX "care_finder_steps_order_idx" ON "care_finder_steps" USING btree ("_order");
  CREATE INDEX "care_finder_steps_parent_id_idx" ON "care_finder_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "care_finder_steps_locales_locale_parent_id_unique" ON "care_finder_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "care_finder_steps_locales_parent_id_idx" ON "care_finder_steps_locales" USING btree ("_parent_id");
  CREATE INDEX "care_finder_rels_order_idx" ON "care_finder_rels" USING btree ("order");
  CREATE INDEX "care_finder_rels_parent_idx" ON "care_finder_rels" USING btree ("parent_id");
  CREATE INDEX "care_finder_rels_path_idx" ON "care_finder_rels" USING btree ("path");
  CREATE INDEX "care_finder_rels_skin_types_id_idx" ON "care_finder_rels" USING btree ("skin_types_id");
  CREATE INDEX "care_finder_rels_skin_conditions_id_idx" ON "care_finder_rels" USING btree ("skin_conditions_id");
  CREATE INDEX "care_finder_rels_skin_concerns_id_idx" ON "care_finder_rels" USING btree ("skin_concerns_id");
  CREATE INDEX "care_finder_rels_categories_id_idx" ON "care_finder_rels" USING btree ("categories_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "care_finder_questions_answers" CASCADE;
  DROP TABLE "care_finder_questions_answers_locales" CASCADE;
  DROP TABLE "care_finder_questions" CASCADE;
  DROP TABLE "care_finder_questions_locales" CASCADE;
  DROP TABLE "care_finder_steps" CASCADE;
  DROP TABLE "care_finder_steps_locales" CASCADE;
  DROP TABLE "care_finder" CASCADE;
  DROP TABLE "care_finder_rels" CASCADE;
  ALTER TABLE "consultation_requests" DROP COLUMN "finder_answers";`)
}
