CREATE TABLE "blobs" (
    "checksum" varchar(255) NOT NULL PRIMARY KEY,
    "blob" bytea
);

CREATE TABLE "tags" (
  "id" serial not null primary key,
  "name" varchar(255),
  "created_at" timestamp not null,
  "updated_at" timestamp not null, 
  "ignore_auto_tag" boolean not null default '0', 
  "description" text, 
  "image_blob" varchar(255) REFERENCES "blobs"("checksum")
);

CREATE TABLE "studios" (
  "id" serial not null primary key,
  "checksum" varchar(255) not null,
  "name" varchar(255),
  "url" varchar(255),
  "parent_id" integer DEFAULT NULL CHECK ( "id" <> "parent_id" ) REFERENCES "studios"("id") on delete set null,
  "created_at" timestamp not null,
  "updated_at" timestamp not null
, "details" text, "rating" smallint, "ignore_auto_tag" boolean not null default '0', "image_blob" varchar(255) REFERENCES "blobs"("checksum"));

CREATE TABLE "movies" (
  "id" serial not null primary key,
  "name" varchar(255) not null,
  "aliases" varchar(255),
  "duration" integer,
  "date" date,
  "rating" smallint,
  "studio_id" integer,
  "director" varchar(255),
  "synopsis" text,
  "checksum" varchar(255) not null,
  "url" varchar(255),
  "created_at" timestamp not null,
  "updated_at" timestamp not null, "front_image_blob" varchar(255) REFERENCES "blobs"("checksum"), "back_image_blob" varchar(255) REFERENCES "blobs"("checksum"),
  foreign key("studio_id") references "studios"("id") on delete set null
);

CREATE TABLE "scraped_items" (
  "id" serial not null primary key,
  "title" varchar(255),
  "description" text,
  "url" varchar(255),
  "date" date,
  "rating" varchar(255),
  "tags" varchar(510),
  "models" varchar(510),
  "episode" integer,
  "gallery_filename" varchar(255),
  "gallery_url" varchar(510),
  "video_filename" varchar(255),
  "video_url" varchar(255),
  "studio_id" integer,
  "created_at" timestamp not null,
  "updated_at" timestamp not null,
  foreign key("studio_id") references "studios"("id")
);

CREATE TABLE IF NOT EXISTS "scenes" (
  "id" serial not null primary key,
  "title" varchar(255),
  "details" text,
  "url" varchar(255),
  "date" date,
  "rating" smallint,
  "studio_id" integer,
  "o_counter" smallint not null default 0,
  "organized" boolean not null default '0',
  "created_at" timestamp not null,
  "updated_at" timestamp not null, "code" text, "director" text, "resume_time" float not null default 0, "last_played_at" timestamp default null, "play_count" smallint not null default 0, "play_duration" float not null default 0, "cover_blob" varchar(255) REFERENCES "blobs"("checksum"),
  foreign key("studio_id") references "studios"("id") on delete SET NULL
);

CREATE TABLE "scene_markers" (
  "id" serial not null primary key,
  "title" varchar(255) not null,
  "seconds" float not null,
  "primary_tag_id" integer not null,
  "scene_id" integer,
  "created_at" timestamp not null,
  "updated_at" timestamp not null,
  foreign key("primary_tag_id") references "tags"("id"),
  foreign key("scene_id") references "scenes"("id")
);

CREATE TABLE "saved_filters" (
  "id" serial not null primary key,
  "name" varchar(510) not null,
  "mode" varchar(255) not null,
  "filter" bytea not null
);

CREATE TABLE tags_relations (
  parent_id integer,
  child_id integer,
  primary key (parent_id, child_id),
  foreign key (parent_id) references tags(id) on delete cascade,
  foreign key (child_id) references tags(id) on delete cascade
);

CREATE TABLE IF NOT EXISTS "images" (
  "id" serial not null primary key,
  "title" varchar(255),
  "rating" smallint,
  "studio_id" integer,
  "o_counter" smallint not null default 0,
  "organized" boolean not null default '0',
  "created_at" timestamp not null,
  "updated_at" timestamp not null, "url" varchar(255), "date" date,
  foreign key("studio_id") references "studios"("id") on delete SET NULL
);

CREATE TABLE IF NOT EXISTS "performers" (
  "id" serial not null primary key,
  "name" varchar(255),
  "disambiguation" varchar(255),
  "gender" varchar(20),
  "url" varchar(255),
  "twitter" varchar(255),
  "instagram" varchar(255),
  "birthdate" date,
  "ethnicity" varchar(255),
  "country" varchar(255),
  "eye_color" varchar(255),
  "height" int,
  "measurements" varchar(255),
  "fake_tits" varchar(255),
  "career_length" varchar(255),
  "tattoos" varchar(255),
  "piercings" varchar(255),
  "favorite" boolean not null default '0',
  "created_at" timestamp not null,
  "updated_at" timestamp not null,
  "details" text, 
  "death_date" date, 
  "hair_color" varchar(255), 
  "weight" integer, 
  "rating" smallint, 
  "ignore_auto_tag" boolean not null default '0', 
  "image_blob" varchar(255) REFERENCES "blobs"("checksum"), 
  "penis_length" float, 
  "circumcised" varchar[10]
);

CREATE TABLE "folders" (
  "id" serial not null primary key,
  "path" varchar(255) NOT NULL,
  "parent_folder_id" integer,
  "mod_time" timestamp not null,
  "created_at" timestamp not null,
  "updated_at" timestamp not null, 
  foreign key("parent_folder_id") references "folders"("id") on delete SET NULL
);


CREATE TABLE IF NOT EXISTS "galleries" (
  "id" serial not null primary key,
  "folder_id" integer,
  "title" varchar(255),
  "url" varchar(255),
  "date" date,
  "details" text,
  "studio_id" integer,
  "rating" smallint,
  "organized" boolean not null default '0',
  "created_at" timestamp not null,
  "updated_at" timestamp not null,
  foreign key("studio_id") references "studios"("id") on delete SET NULL,
  foreign key("folder_id") references "folders"("id") on delete SET NULL
);

CREATE TABLE "files" (
  "id" serial not null primary key,
  "basename" varchar(255) NOT NULL,
  "zip_file_id" integer,
  "parent_folder_id" integer not null,
  "size" integer NOT NULL,
  "mod_time" timestamp not null,
  "created_at" timestamp not null,
  "updated_at" timestamp not null,
  foreign key("parent_folder_id") references "folders"("id"),
  foreign key("zip_file_id") references "files"("id"),
  CHECK ("basename" != '')
);

ALTER TABLE "folders" ADD COLUMN "zip_file_id" integer REFERENCES "files"("id");

CREATE TABLE "files_fingerprints" (
  "file_id" integer NOT NULL,
  "type" varchar(255) NOT NULL,
  "fingerprint" bytea NOT NULL,
  foreign key("file_id") references "files"("id") on delete CASCADE,
  PRIMARY KEY ("file_id", "type", "fingerprint")
);

CREATE TABLE "video_files" (
  "file_id" integer NOT NULL primary key,
  "duration" float NOT NULL,
	"video_codec" varchar(255) NOT NULL,
	"format" varchar(255) NOT NULL,
	"audio_codec" varchar(255) NOT NULL,
	"width" smallint NOT NULL,
	"height" smallint NOT NULL,
	"frame_rate" float NOT NULL,
	"bit_rate" integer NOT NULL,
  "interactive" boolean not null default '0',
  "interactive_speed" int,
  foreign key("file_id") references "files"("id") on delete CASCADE
);

CREATE TABLE "video_captions" (
  "file_id" integer NOT NULL,
  "language_code" varchar(255) NOT NULL,
  "filename" varchar(255) NOT NULL,
  "caption_type" varchar(255) NOT NULL,
  primary key ("file_id", "language_code", "caption_type"),
  foreign key("file_id") references "video_files"("file_id") on delete CASCADE
);

CREATE TABLE "image_files" (
  "file_id" integer NOT NULL primary key,
  "format" varchar(255) NOT NULL,
  "width" smallint NOT NULL,
	"height" smallint NOT NULL,
  foreign key("file_id") references "files"("id") on delete CASCADE
);

CREATE TABLE "images_files" (
  "image_id" integer NOT NULL,
  "file_id" integer NOT NULL,
  "primary" boolean NOT NULL,
  foreign key("image_id") references "images"("id") on delete CASCADE,
  foreign key("file_id") references "files"("id") on delete CASCADE,
  PRIMARY KEY("image_id", "file_id")
);

CREATE TABLE "galleries_files" (
  "gallery_id" integer NOT NULL,
  "file_id" integer NOT NULL,
  "primary" boolean NOT NULL,
  foreign key("gallery_id") references "galleries"("id") on delete CASCADE,
  foreign key("file_id") references "files"("id") on delete CASCADE,
  PRIMARY KEY("gallery_id", "file_id")
);

CREATE TABLE "scenes_files" (
  "scene_id" integer NOT NULL,
  "file_id" integer NOT NULL,
  "primary" boolean NOT NULL,
  foreign key("scene_id") references "scenes"("id") on delete CASCADE,
  foreign key("file_id") references "files"("id") on delete CASCADE,
  PRIMARY KEY("scene_id", "file_id")
);

CREATE TABLE IF NOT EXISTS "performers_scenes" (
  "performer_id" integer,
  "scene_id" integer,
  foreign key("performer_id") references "performers"("id") on delete CASCADE,
  foreign key("scene_id") references "scenes"("id") on delete CASCADE,
  PRIMARY KEY ("scene_id", "performer_id")
);

CREATE TABLE IF NOT EXISTS "scene_markers_tags" (
  "scene_marker_id" integer,
  "tag_id" integer,
  foreign key("scene_marker_id") references "scene_markers"("id") on delete CASCADE,
  foreign key("tag_id") references "tags"("id") on delete CASCADE,
  PRIMARY KEY("scene_marker_id", "tag_id")
);

CREATE TABLE IF NOT EXISTS "scenes_tags" (
  "scene_id" integer,
  "tag_id" integer,
  foreign key("scene_id") references "scenes"("id") on delete CASCADE,
  foreign key("tag_id") references "tags"("id") on delete CASCADE,
  PRIMARY KEY("scene_id", "tag_id")
);

CREATE TABLE IF NOT EXISTS "movies_scenes" (
  "movie_id" integer,
  "scene_id" integer,
  "scene_index" smallint,
  foreign key("movie_id") references "movies"("id") on delete cascade,
  foreign key("scene_id") references "scenes"("id") on delete cascade,
  PRIMARY KEY("movie_id", "scene_id")
);

CREATE TABLE IF NOT EXISTS "performers_images" (
  "performer_id" integer,
  "image_id" integer,
  foreign key("performer_id") references "performers"("id") on delete CASCADE,
  foreign key("image_id") references "images"("id") on delete CASCADE,
  PRIMARY KEY("image_id", "performer_id")
);

CREATE TABLE IF NOT EXISTS "images_tags" (
  "image_id" integer,
  "tag_id" integer,
  foreign key("image_id") references "images"("id") on delete CASCADE,
  foreign key("tag_id") references "tags"("id") on delete CASCADE,
  PRIMARY KEY("image_id", "tag_id")
);

CREATE TABLE IF NOT EXISTS "scene_stash_ids" (
  "scene_id" integer NOT NULL,
  "endpoint" varchar(255) NOT NULL,
  "stash_id" varchar(36) NOT NULL,
  foreign key("scene_id") references "scenes"("id") on delete CASCADE,
  PRIMARY KEY("scene_id", "endpoint")
);

CREATE TABLE IF NOT EXISTS "performer_stash_ids" (
  "performer_id" integer NOT NULL,
  "endpoint" varchar(255) NOT NULL,
  "stash_id" varchar(36) NOT NULL,
  foreign key("performer_id") references "performers"("id") on delete CASCADE,
  PRIMARY KEY("performer_id", "endpoint")
);

CREATE TABLE IF NOT EXISTS "studio_stash_ids" (
  "studio_id" integer NOT NULL,
  "endpoint" varchar(255) NOT NULL,
  "stash_id" varchar(36) NOT NULL,
  foreign key("studio_id") references "studios"("id") on delete CASCADE,
  PRIMARY KEY("studio_id", "endpoint")
);

CREATE TABLE IF NOT EXISTS "scenes_galleries" (
  "scene_id" integer NOT NULL,
  "gallery_id" integer NOT NULL,
  foreign key("scene_id") references "scenes"("id") on delete CASCADE,
  foreign key("gallery_id") references "galleries"("id") on delete CASCADE,
  PRIMARY KEY("scene_id", "gallery_id")
);

CREATE TABLE IF NOT EXISTS "galleries_images" (
  "gallery_id" integer NOT NULL,
  "image_id" integer NOT NULL,
  foreign key("gallery_id") references "galleries"("id") on delete CASCADE,
  foreign key("image_id") references "images"("id") on delete CASCADE,
  PRIMARY KEY("gallery_id", "image_id")
);

CREATE TABLE IF NOT EXISTS "performers_galleries" (
  "performer_id" integer NOT NULL,
  "gallery_id" integer NOT NULL,
  foreign key("performer_id") references "performers"("id") on delete CASCADE,
  foreign key("gallery_id") references "galleries"("id") on delete CASCADE,
  PRIMARY KEY("gallery_id", "performer_id")
);

CREATE TABLE IF NOT EXISTS "galleries_tags" (
  "gallery_id" integer NOT NULL,
  "tag_id" integer NOT NULL,
  foreign key("gallery_id") references "galleries"("id") on delete CASCADE,
  foreign key("tag_id") references "tags"("id") on delete CASCADE,
  PRIMARY KEY("gallery_id", "tag_id")
);

CREATE TABLE IF NOT EXISTS "performers_tags" (
  "performer_id" integer NOT NULL,
  "tag_id" integer NOT NULL,
  foreign key("performer_id") references "performers"("id") on delete CASCADE,
  foreign key("tag_id") references "tags"("id") on delete CASCADE,
  PRIMARY KEY("performer_id", "tag_id")
);

CREATE TABLE IF NOT EXISTS "tag_aliases" (
  "tag_id" integer NOT NULL,
  "alias" varchar(255) NOT NULL,
  foreign key("tag_id") references "tags"("id") on delete CASCADE,
  PRIMARY KEY("tag_id", "alias")
);

CREATE TABLE IF NOT EXISTS "studio_aliases" (
  "studio_id" integer NOT NULL,
  "alias" varchar(255) NOT NULL,
  foreign key("studio_id") references "studios"("id") on delete CASCADE,
  PRIMARY KEY("studio_id", "alias")
);

CREATE TABLE "performer_aliases" (
  "performer_id" integer NOT NULL,
  "alias" varchar(255) NOT NULL,
  foreign key("performer_id") references "performers"("id") on delete CASCADE,
  PRIMARY KEY("performer_id", "alias")
);

CREATE TABLE "galleries_chapters" (
  "id" serial not null primary key,
  "title" varchar(255) not null,
  "image_index" integer not null,
  "gallery_id" integer not null,
  "created_at" timestamp not null,
  "updated_at" timestamp not null,
  foreign key("gallery_id") references "galleries"("id") on delete CASCADE
);

CREATE UNIQUE INDEX version_unique ON schema_migrations (version);
CREATE INDEX "index_tags_on_name" on "tags" ("name");
CREATE UNIQUE INDEX "studios_checksum_unique" on "studios" ("checksum");
CREATE INDEX "index_studios_on_name" on "studios" ("name");
CREATE INDEX "index_studios_on_checksum" on "studios" ("checksum");
CREATE UNIQUE INDEX "movies_name_unique" on "movies" ("name");
CREATE UNIQUE INDEX "movies_checksum_unique" on "movies" ("checksum");
CREATE INDEX "index_movies_on_studio_id" on "movies" ("studio_id");
CREATE INDEX "index_scraped_items_on_studio_id" on "scraped_items" ("studio_id");
CREATE INDEX "index_scene_markers_on_scene_id" on "scene_markers" ("scene_id");
CREATE INDEX "index_scene_markers_on_primary_tag_id" on "scene_markers" ("primary_tag_id");
CREATE UNIQUE INDEX "index_saved_filters_on_mode_name_unique" on "saved_filters" ("mode", "name");
CREATE INDEX "index_folders_on_parent_folder_id" on "folders" ("parent_folder_id");
CREATE UNIQUE INDEX "index_folders_on_path_unique" on "folders" ("path");
CREATE UNIQUE INDEX "index_files_zip_basename_unique" ON "files" ("zip_file_id", "parent_folder_id", "basename") WHERE "zip_file_id" IS NOT NULL;
CREATE UNIQUE INDEX "index_files_on_parent_folder_id_basename_unique" on "files" ("parent_folder_id", "basename");
CREATE INDEX "index_files_on_basename" on "files" ("basename");
CREATE INDEX "index_folders_on_zip_file_id" on "folders" ("zip_file_id") WHERE "zip_file_id" IS NOT NULL;
CREATE INDEX "index_fingerprint_type_fingerprint" ON "files_fingerprints" ("type", "fingerprint");
CREATE INDEX "index_images_files_on_file_id" on "images_files" ("file_id");
CREATE UNIQUE INDEX "unique_index_images_files_on_primary" on "images_files" ("image_id") WHERE "primary"IS TRUE;
CREATE INDEX "index_galleries_files_file_id" ON "galleries_files" ("file_id");
CREATE UNIQUE INDEX "unique_index_galleries_files_on_primary" on "galleries_files" ("gallery_id") WHERE "primary"IS TRUE;
CREATE INDEX "index_scenes_files_file_id" ON "scenes_files" ("file_id");
CREATE UNIQUE INDEX "unique_index_scenes_files_on_primary" on "scenes_files" ("scene_id") WHERE "primary"IS TRUE;
CREATE INDEX "index_images_on_studio_id" on "images" ("studio_id");
CREATE INDEX "index_galleries_on_studio_id" on "galleries" ("studio_id");
CREATE UNIQUE INDEX "index_galleries_on_folder_id_unique" on "galleries" ("folder_id");
CREATE INDEX "index_scenes_on_studio_id" on "scenes" ("studio_id");
CREATE INDEX "index_performers_scenes_on_performer_id" on "performers_scenes" ("performer_id");
CREATE INDEX "index_scene_markers_tags_on_tag_id" on "scene_markers_tags" ("tag_id");
CREATE INDEX "index_scenes_tags_on_tag_id" on "scenes_tags" ("tag_id");
CREATE INDEX "index_movies_scenes_on_movie_id" on "movies_scenes" ("movie_id");
CREATE INDEX "index_performers_images_on_performer_id" on "performers_images" ("performer_id");
CREATE INDEX "index_images_tags_on_tag_id" on "images_tags" ("tag_id");
CREATE INDEX "index_scenes_galleries_on_gallery_id" on "scenes_galleries" ("gallery_id");
CREATE INDEX "index_galleries_images_on_image_id" on "galleries_images" ("image_id");
CREATE INDEX "index_performers_galleries_on_performer_id" on "performers_galleries" ("performer_id");
CREATE INDEX "index_galleries_tags_on_tag_id" on "galleries_tags" ("tag_id");
CREATE INDEX "index_performers_tags_on_tag_id" on "performers_tags" ("tag_id");
CREATE UNIQUE INDEX "tag_aliases_alias_unique" on "tag_aliases" ("alias");
CREATE UNIQUE INDEX "studio_aliases_alias_unique" on "studio_aliases" ("alias");
CREATE INDEX "performer_aliases_alias" on "performer_aliases" ("alias");
CREATE UNIQUE INDEX "performers_name_disambiguation_unique" on "performers" ("name", "disambiguation") WHERE "disambiguation" IS NOT NULL;
CREATE UNIQUE INDEX "performers_name_unique" on "performers" ("name") WHERE "disambiguation" IS NULL;
CREATE INDEX "index_galleries_chapters_on_gallery_id" on "galleries_chapters" ("gallery_id");
