import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_posts_blocks_products_collection" AS ENUM('new', 'bestsellers', 'sets', 'minis');
  CREATE TYPE "public"."enum_posts_blocks_tiles_source" AS ENUM('zones', 'concerns', 'types');
  CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__posts_v_blocks_products_collection" AS ENUM('new', 'bestsellers', 'sets', 'minis');
  CREATE TYPE "public"."enum__posts_v_blocks_tiles_source" AS ENUM('zones', 'concerns', 'types');
  CREATE TYPE "public"."enum__posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__posts_v_published_locale" AS ENUM('uk', 'en');
  CREATE TABLE "pages_blocks_posts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_posts_locales" (
  	"title" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "posts_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"button_link" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_hero_locales" (
  	"title" varchar,
  	"subtitle" varchar,
  	"text" varchar,
  	"button_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "posts_blocks_products" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"collection" "enum_posts_blocks_products_collection",
  	"limit" numeric DEFAULT 4,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_products_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "posts_blocks_tiles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source" "enum_posts_blocks_tiles_source",
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_tiles_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "posts_blocks_brands" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_brands_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "posts_blocks_posts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_posts_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "posts_blocks_consultation" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_consultation_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "posts_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_text_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"published_at" timestamp(3) with time zone,
  	"cover_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_posts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "posts_locales" (
  	"title" varchar,
  	"excerpt" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_posts_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"button_link" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_hero_locales" (
  	"title" varchar,
  	"subtitle" varchar,
  	"text" varchar,
  	"button_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_posts_v_blocks_products" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"collection" "enum__posts_v_blocks_products_collection",
  	"limit" numeric DEFAULT 4,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_products_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_posts_v_blocks_tiles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"source" "enum__posts_v_blocks_tiles_source",
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_tiles_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_posts_v_blocks_brands" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_brands_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_posts_v_blocks_posts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_posts_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_posts_v_blocks_consultation" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_consultation_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_posts_v_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_text_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_cover_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__posts_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_posts_v_locales" (
  	"version_title" varchar,
  	"version_excerpt" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "posts_id" integer;
  ALTER TABLE "pages_blocks_posts" ADD CONSTRAINT "pages_blocks_posts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_posts_locales" ADD CONSTRAINT "pages_blocks_posts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_hero" ADD CONSTRAINT "posts_blocks_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_hero" ADD CONSTRAINT "posts_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_hero_locales" ADD CONSTRAINT "posts_blocks_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_products" ADD CONSTRAINT "posts_blocks_products_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_products_locales" ADD CONSTRAINT "posts_blocks_products_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_tiles" ADD CONSTRAINT "posts_blocks_tiles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_tiles_locales" ADD CONSTRAINT "posts_blocks_tiles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_tiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_brands" ADD CONSTRAINT "posts_blocks_brands_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_brands_locales" ADD CONSTRAINT "posts_blocks_brands_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_posts" ADD CONSTRAINT "posts_blocks_posts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_posts_locales" ADD CONSTRAINT "posts_blocks_posts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_consultation" ADD CONSTRAINT "posts_blocks_consultation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_consultation_locales" ADD CONSTRAINT "posts_blocks_consultation_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_consultation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_text" ADD CONSTRAINT "posts_blocks_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_text" ADD CONSTRAINT "posts_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_text_locales" ADD CONSTRAINT "posts_blocks_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_locales" ADD CONSTRAINT "posts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_hero" ADD CONSTRAINT "_posts_v_blocks_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_hero" ADD CONSTRAINT "_posts_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_hero_locales" ADD CONSTRAINT "_posts_v_blocks_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_products" ADD CONSTRAINT "_posts_v_blocks_products_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_products_locales" ADD CONSTRAINT "_posts_v_blocks_products_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_tiles" ADD CONSTRAINT "_posts_v_blocks_tiles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_tiles_locales" ADD CONSTRAINT "_posts_v_blocks_tiles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_tiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_brands" ADD CONSTRAINT "_posts_v_blocks_brands_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_brands_locales" ADD CONSTRAINT "_posts_v_blocks_brands_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_posts" ADD CONSTRAINT "_posts_v_blocks_posts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_posts_locales" ADD CONSTRAINT "_posts_v_blocks_posts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_consultation" ADD CONSTRAINT "_posts_v_blocks_consultation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_consultation_locales" ADD CONSTRAINT "_posts_v_blocks_consultation_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_consultation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_text" ADD CONSTRAINT "_posts_v_blocks_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_text" ADD CONSTRAINT "_posts_v_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_text_locales" ADD CONSTRAINT "_posts_v_blocks_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_parent_id_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_locales" ADD CONSTRAINT "_posts_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_posts_order_idx" ON "pages_blocks_posts" USING btree ("_order");
  CREATE INDEX "pages_blocks_posts_parent_id_idx" ON "pages_blocks_posts" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_posts_path_idx" ON "pages_blocks_posts" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_posts_locales_locale_parent_id_unique" ON "pages_blocks_posts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_posts_locales_parent_id_idx" ON "pages_blocks_posts_locales" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_hero_order_idx" ON "posts_blocks_hero" USING btree ("_order");
  CREATE INDEX "posts_blocks_hero_parent_id_idx" ON "posts_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_hero_path_idx" ON "posts_blocks_hero" USING btree ("_path");
  CREATE INDEX "posts_blocks_hero_image_idx" ON "posts_blocks_hero" USING btree ("image_id");
  CREATE UNIQUE INDEX "posts_blocks_hero_locales_locale_parent_id_unique" ON "posts_blocks_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "posts_blocks_hero_locales_parent_id_idx" ON "posts_blocks_hero_locales" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_products_order_idx" ON "posts_blocks_products" USING btree ("_order");
  CREATE INDEX "posts_blocks_products_parent_id_idx" ON "posts_blocks_products" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_products_path_idx" ON "posts_blocks_products" USING btree ("_path");
  CREATE UNIQUE INDEX "posts_blocks_products_locales_locale_parent_id_unique" ON "posts_blocks_products_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "posts_blocks_products_locales_parent_id_idx" ON "posts_blocks_products_locales" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_tiles_order_idx" ON "posts_blocks_tiles" USING btree ("_order");
  CREATE INDEX "posts_blocks_tiles_parent_id_idx" ON "posts_blocks_tiles" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_tiles_path_idx" ON "posts_blocks_tiles" USING btree ("_path");
  CREATE UNIQUE INDEX "posts_blocks_tiles_locales_locale_parent_id_unique" ON "posts_blocks_tiles_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "posts_blocks_tiles_locales_parent_id_idx" ON "posts_blocks_tiles_locales" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_brands_order_idx" ON "posts_blocks_brands" USING btree ("_order");
  CREATE INDEX "posts_blocks_brands_parent_id_idx" ON "posts_blocks_brands" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_brands_path_idx" ON "posts_blocks_brands" USING btree ("_path");
  CREATE UNIQUE INDEX "posts_blocks_brands_locales_locale_parent_id_unique" ON "posts_blocks_brands_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "posts_blocks_brands_locales_parent_id_idx" ON "posts_blocks_brands_locales" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_posts_order_idx" ON "posts_blocks_posts" USING btree ("_order");
  CREATE INDEX "posts_blocks_posts_parent_id_idx" ON "posts_blocks_posts" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_posts_path_idx" ON "posts_blocks_posts" USING btree ("_path");
  CREATE UNIQUE INDEX "posts_blocks_posts_locales_locale_parent_id_unique" ON "posts_blocks_posts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "posts_blocks_posts_locales_parent_id_idx" ON "posts_blocks_posts_locales" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_consultation_order_idx" ON "posts_blocks_consultation" USING btree ("_order");
  CREATE INDEX "posts_blocks_consultation_parent_id_idx" ON "posts_blocks_consultation" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_consultation_path_idx" ON "posts_blocks_consultation" USING btree ("_path");
  CREATE UNIQUE INDEX "posts_blocks_consultation_locales_locale_parent_id_unique" ON "posts_blocks_consultation_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "posts_blocks_consultation_locales_parent_id_idx" ON "posts_blocks_consultation_locales" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_text_order_idx" ON "posts_blocks_text" USING btree ("_order");
  CREATE INDEX "posts_blocks_text_parent_id_idx" ON "posts_blocks_text" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_text_path_idx" ON "posts_blocks_text" USING btree ("_path");
  CREATE INDEX "posts_blocks_text_image_idx" ON "posts_blocks_text" USING btree ("image_id");
  CREATE UNIQUE INDEX "posts_blocks_text_locales_locale_parent_id_unique" ON "posts_blocks_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "posts_blocks_text_locales_parent_id_idx" ON "posts_blocks_text_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE INDEX "posts_published_at_idx" ON "posts" USING btree ("published_at");
  CREATE INDEX "posts_cover_idx" ON "posts" USING btree ("cover_id");
  CREATE INDEX "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");
  CREATE INDEX "posts__status_idx" ON "posts" USING btree ("_status");
  CREATE UNIQUE INDEX "posts_locales_locale_parent_id_unique" ON "posts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "posts_locales_parent_id_idx" ON "posts_locales" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_hero_order_idx" ON "_posts_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_hero_parent_id_idx" ON "_posts_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_hero_path_idx" ON "_posts_v_blocks_hero" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_hero_image_idx" ON "_posts_v_blocks_hero" USING btree ("image_id");
  CREATE UNIQUE INDEX "_posts_v_blocks_hero_locales_locale_parent_id_unique" ON "_posts_v_blocks_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_posts_v_blocks_hero_locales_parent_id_idx" ON "_posts_v_blocks_hero_locales" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_products_order_idx" ON "_posts_v_blocks_products" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_products_parent_id_idx" ON "_posts_v_blocks_products" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_products_path_idx" ON "_posts_v_blocks_products" USING btree ("_path");
  CREATE UNIQUE INDEX "_posts_v_blocks_products_locales_locale_parent_id_unique" ON "_posts_v_blocks_products_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_posts_v_blocks_products_locales_parent_id_idx" ON "_posts_v_blocks_products_locales" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_tiles_order_idx" ON "_posts_v_blocks_tiles" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_tiles_parent_id_idx" ON "_posts_v_blocks_tiles" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_tiles_path_idx" ON "_posts_v_blocks_tiles" USING btree ("_path");
  CREATE UNIQUE INDEX "_posts_v_blocks_tiles_locales_locale_parent_id_unique" ON "_posts_v_blocks_tiles_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_posts_v_blocks_tiles_locales_parent_id_idx" ON "_posts_v_blocks_tiles_locales" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_brands_order_idx" ON "_posts_v_blocks_brands" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_brands_parent_id_idx" ON "_posts_v_blocks_brands" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_brands_path_idx" ON "_posts_v_blocks_brands" USING btree ("_path");
  CREATE UNIQUE INDEX "_posts_v_blocks_brands_locales_locale_parent_id_unique" ON "_posts_v_blocks_brands_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_posts_v_blocks_brands_locales_parent_id_idx" ON "_posts_v_blocks_brands_locales" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_posts_order_idx" ON "_posts_v_blocks_posts" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_posts_parent_id_idx" ON "_posts_v_blocks_posts" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_posts_path_idx" ON "_posts_v_blocks_posts" USING btree ("_path");
  CREATE UNIQUE INDEX "_posts_v_blocks_posts_locales_locale_parent_id_unique" ON "_posts_v_blocks_posts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_posts_v_blocks_posts_locales_parent_id_idx" ON "_posts_v_blocks_posts_locales" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_consultation_order_idx" ON "_posts_v_blocks_consultation" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_consultation_parent_id_idx" ON "_posts_v_blocks_consultation" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_consultation_path_idx" ON "_posts_v_blocks_consultation" USING btree ("_path");
  CREATE UNIQUE INDEX "_posts_v_blocks_consultation_locales_locale_parent_id_unique" ON "_posts_v_blocks_consultation_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_posts_v_blocks_consultation_locales_parent_id_idx" ON "_posts_v_blocks_consultation_locales" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_text_order_idx" ON "_posts_v_blocks_text" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_text_parent_id_idx" ON "_posts_v_blocks_text" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_text_path_idx" ON "_posts_v_blocks_text" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_text_image_idx" ON "_posts_v_blocks_text" USING btree ("image_id");
  CREATE UNIQUE INDEX "_posts_v_blocks_text_locales_locale_parent_id_unique" ON "_posts_v_blocks_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_posts_v_blocks_text_locales_parent_id_idx" ON "_posts_v_blocks_text_locales" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_parent_idx" ON "_posts_v" USING btree ("parent_id");
  CREATE INDEX "_posts_v_version_version_slug_idx" ON "_posts_v" USING btree ("version_slug");
  CREATE INDEX "_posts_v_version_version_published_at_idx" ON "_posts_v" USING btree ("version_published_at");
  CREATE INDEX "_posts_v_version_version_cover_idx" ON "_posts_v" USING btree ("version_cover_id");
  CREATE INDEX "_posts_v_version_version_updated_at_idx" ON "_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_posts_v_version_version_created_at_idx" ON "_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_posts_v_version_version__status_idx" ON "_posts_v" USING btree ("version__status");
  CREATE INDEX "_posts_v_created_at_idx" ON "_posts_v" USING btree ("created_at");
  CREATE INDEX "_posts_v_updated_at_idx" ON "_posts_v" USING btree ("updated_at");
  CREATE INDEX "_posts_v_snapshot_idx" ON "_posts_v" USING btree ("snapshot");
  CREATE INDEX "_posts_v_published_locale_idx" ON "_posts_v" USING btree ("published_locale");
  CREATE INDEX "_posts_v_latest_idx" ON "_posts_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_posts_v_locales_locale_parent_id_unique" ON "_posts_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_posts_v_locales_parent_id_idx" ON "_posts_v_locales" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_posts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_posts_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_hero_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_products" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_products_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_tiles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_tiles_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_brands" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_brands_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_posts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_posts_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_consultation" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_consultation_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_hero_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_products" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_products_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_tiles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_tiles_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_brands" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_brands_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_posts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_posts_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_consultation" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_consultation_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_posts" CASCADE;
  DROP TABLE "pages_blocks_posts_locales" CASCADE;
  DROP TABLE "posts_blocks_hero" CASCADE;
  DROP TABLE "posts_blocks_hero_locales" CASCADE;
  DROP TABLE "posts_blocks_products" CASCADE;
  DROP TABLE "posts_blocks_products_locales" CASCADE;
  DROP TABLE "posts_blocks_tiles" CASCADE;
  DROP TABLE "posts_blocks_tiles_locales" CASCADE;
  DROP TABLE "posts_blocks_brands" CASCADE;
  DROP TABLE "posts_blocks_brands_locales" CASCADE;
  DROP TABLE "posts_blocks_posts" CASCADE;
  DROP TABLE "posts_blocks_posts_locales" CASCADE;
  DROP TABLE "posts_blocks_consultation" CASCADE;
  DROP TABLE "posts_blocks_consultation_locales" CASCADE;
  DROP TABLE "posts_blocks_text" CASCADE;
  DROP TABLE "posts_blocks_text_locales" CASCADE;
  DROP TABLE "posts" CASCADE;
  DROP TABLE "posts_locales" CASCADE;
  DROP TABLE "_posts_v_blocks_hero" CASCADE;
  DROP TABLE "_posts_v_blocks_hero_locales" CASCADE;
  DROP TABLE "_posts_v_blocks_products" CASCADE;
  DROP TABLE "_posts_v_blocks_products_locales" CASCADE;
  DROP TABLE "_posts_v_blocks_tiles" CASCADE;
  DROP TABLE "_posts_v_blocks_tiles_locales" CASCADE;
  DROP TABLE "_posts_v_blocks_brands" CASCADE;
  DROP TABLE "_posts_v_blocks_brands_locales" CASCADE;
  DROP TABLE "_posts_v_blocks_posts" CASCADE;
  DROP TABLE "_posts_v_blocks_posts_locales" CASCADE;
  DROP TABLE "_posts_v_blocks_consultation" CASCADE;
  DROP TABLE "_posts_v_blocks_consultation_locales" CASCADE;
  DROP TABLE "_posts_v_blocks_text" CASCADE;
  DROP TABLE "_posts_v_blocks_text_locales" CASCADE;
  DROP TABLE "_posts_v" CASCADE;
  DROP TABLE "_posts_v_locales" CASCADE;
  DROP INDEX "payload_locked_documents_rels_posts_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "posts_id";
  DROP TYPE "public"."enum_posts_blocks_products_collection";
  DROP TYPE "public"."enum_posts_blocks_tiles_source";
  DROP TYPE "public"."enum_posts_status";
  DROP TYPE "public"."enum__posts_v_blocks_products_collection";
  DROP TYPE "public"."enum__posts_v_blocks_tiles_source";
  DROP TYPE "public"."enum__posts_v_version_status";
  DROP TYPE "public"."enum__posts_v_published_locale";`)
}
