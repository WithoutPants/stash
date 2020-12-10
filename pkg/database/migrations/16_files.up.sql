CREATE TABLE `files` (
  `id` integer not null primary key autoincrement,
  `path` varchar(510) not null,
  `checksum` varchar(255),
  `oshash` varchar(255),
  `size` integer,
  `duration` float,
  `video_codec` varchar(255),
  `audio_codec` varchar(255),
  `width` tinyint,
  `height` tinyint,
  `framerate` float,
  `bitrate` integer,
  `format` varchar(255),
  `file_mod_time` datetime,
  `created_at` datetime not null,
  `updated_at` datetime not null,
  CHECK (`checksum` is not null or `oshash` is not null)
);

CREATE UNIQUE INDEX `file_path_unique` on `files` (`path`);
CREATE INDEX `file_checksum` on `files` (`checksum`);
CREATE INDEX `file_oshash` on `files` (`oshash`);

CREATE TABLE `scenes_files` (
  `scene_id` integer,
  `file_id` integer,
  `primary` boolean not null default '0',
  foreign key(`scene_id`) references `scenes`(`id`),
  foreign key(`file_id`) references `files`(`id`)
);

CREATE TABLE `images_files` (
  `image_id` integer,
  `file_id` integer,
  `primary` boolean not null default '0',
  foreign key(`image_id`) references `images`(`id`),
  foreign key(`file_id`) references `files`(`id`)
);

CREATE TABLE `galleries_files` (
  `gallery_id` integer,
  `file_id` integer,
  `primary` boolean not null default '0',
  foreign key(`gallery_id`) references `galleries`(`id`),
  foreign key(`file_id`) references `files`(`id`)
);

-- translate scenes, images and galleries into files
INSERT INTO `files`
 (
  `path`,
  `checksum`,
  `oshash`,
  `size`,
  `duration`,
  `video_codec`,
  `audio_codec`,
  `width`,
  `height`,
  `framerate`,
  `bitrate`,
  `format`,
  `file_mod_time`,
  `created_at`,
  `updated_at`
 )
 SELECT
  `path`,
  `checksum`,
  `oshash`,
  `size`,
  `duration`,
  `video_codec`,
  `audio_codec`,
  `width`,
  `height`,
  `framerate`,
  `bitrate`,
  `format`,
  `file_mod_time`,
  `created_at`,
  `updated_at`
 )
 FROM `scenes`;

INSERT INTO `files`
 (
  `path`,
  `checksum`,
  `size`,
  `width`,
  `height`,
  `file_mod_time`,
  `created_at`,
  `updated_at`
 )
 SELECT
  `path`,
  `checksum`,
  `size`,
  `width`,
  `height`,
  `file_mod_time`,
  `created_at`,
  `updated_at`
 )
 FROM `images`;

INSERT INTO `files`
 (
  `path`,
  `checksum`,
  `file_mod_time`,
  `created_at`,
  `updated_at`
 )
 SELECT
  `path`,
  `checksum`,
  `file_mod_time`,
  `created_at`,
  `updated_at`
 )
 FROM `galleries`
 WHERE `zip` = '1';

-- now remove fields that are no longer necessary
ALTER TABLE `scenes` rename to `_scenes_old`;

CREATE TABLE `scenes` (
  `id` integer not null primary key autoincrement,
  `title` varchar(255),
  `details` text,
  `url` varchar(255),
  `date` date,
  `rating` tinyint,
  `studio_id` integer,
  `o_counter` tinyint not null default 0,
  `created_at` datetime not null,
  `updated_at` datetime not null,
  foreign key(`studio_id`) references `studios`(`id`) on delete SET NULL,
);

DROP INDEX IF EXISTS `scenes_path_unique`;
DROP INDEX IF EXISTS `scenes_checksum_unique`;
DROP INDEX IF EXISTS `index_scenes_on_studio_id`;

CREATE INDEX `index_scenes_on_studio_id` on `scenes` (`studio_id`);


ALTER TABLE `galleries` rename to `_galleries_old`;

CREATE TABLE `galleries` (
  `id` integer not null primary key autoincrement,
  `zip` boolean not null default '0',
  `title` varchar(255),
  `url` varchar(255),
  `date` date,
  `details` text,
  `studio_id` integer,
  `rating` tinyint,
  `scene_id` integer,
  `created_at` datetime not null,
  `updated_at` datetime not null,
  foreign key(`scene_id`) references `scenes`(`id`) on delete SET NULL,
  foreign key(`studio_id`) references `studios`(`id`) on delete SET NULL
);

DROP INDEX IF EXISTS `index_galleries_on_scene_id`;
DROP INDEX IF EXISTS `galleries_path_unique`;
DROP INDEX IF EXISTS `galleries_checksum_unique`;

CREATE INDEX `index_galleries_on_scene_id` on `galleries` (`scene_id`);
CREATE INDEX `index_galleries_on_studio_id` on `galleries` (`studio_id`);


ALTER TABLE `images` rename to `_images_old`;

CREATE TABLE `images` (
  `id` integer not null primary key autoincrement,
  `title` varchar(255),
  `rating` tinyint,
  `studio_id` integer,
  `o_counter` tinyint not null default 0,
  `created_at` datetime not null,
  `updated_at` datetime not null,
  foreign key(`studio_id`) references `studios`(`id`) on delete SET NULL
);

DROP INDEX IF EXISTS `index_images_on_studio_id`;

CREATE INDEX `index_images_on_studio_id` on `images` (`studio_id`);


-- recreate the tables referencing the modified tables to correct their references

ALTER TABLE `performers_scenes` rename to `_performers_scenes_old`;
ALTER TABLE `scene_markers` rename to `_scene_markers_old`;
ALTER TABLE `scene_markers_tags` rename to `_scene_markers_tags_old`;
ALTER TABLE `scenes_tags` rename to `_scenes_tags_old`;
ALTER TABLE `movies_scenes` rename to `_movies_scenes_old`;
ALTER TABLE `scenes_cover` rename to `_scenes_cover_old`;
ALTER TABLE `scene_stash_ids` rename to `_scene_stash_ids`;
ALTER TABLE `galleries_images` rename to `_galleries_images`;
ALTER TABLE `galleries_tags` rename to `_galleries_tags`;
ALTER TABLE `performers_galleries` rename to `_performers_galleries`;
ALTER TABLE `performers_images` rename to `_performers_images`;
ALTER TABLE `images_tags` rename to `_images_tags`;

CREATE TABLE `performers_scenes` (
  `performer_id` integer,
  `scene_id` integer,
  foreign key(`performer_id`) references `performers`(`id`),
  foreign key(`scene_id`) references `scenes`(`id`)
);

DROP INDEX `index_performers_scenes_on_scene_id`;
DROP INDEX `index_performers_scenes_on_performer_id`;

CREATE INDEX `index_performers_scenes_on_scene_id` on `performers_scenes` (`scene_id`);
CREATE INDEX `index_performers_scenes_on_performer_id` on `performers_scenes` (`performer_id`);

CREATE TABLE `scene_markers` (
  `id` integer not null primary key autoincrement,
  `title` varchar(255) not null,
  `seconds` float not null,
  `primary_tag_id` integer not null,
  `scene_id` integer,
  `created_at` datetime not null,
  `updated_at` datetime not null,
  foreign key(`primary_tag_id`) references `tags`(`id`),
  foreign key(`scene_id`) references `scenes`(`id`)
);

DROP INDEX `index_scene_markers_on_scene_id`;
DROP INDEX `index_scene_markers_on_primary_tag_id`;

CREATE INDEX `index_scene_markers_on_scene_id` on `scene_markers` (`scene_id`);
CREATE INDEX `index_scene_markers_on_primary_tag_id` on `scene_markers` (`primary_tag_id`);

CREATE TABLE `scene_markers_tags` (
  `scene_marker_id` integer,
  `tag_id` integer,
  foreign key(`scene_marker_id`) references `scene_markers`(`id`) on delete CASCADE,
  foreign key(`tag_id`) references `tags`(`id`)
);

DROP INDEX `index_scene_markers_tags_on_tag_id`;
DROP INDEX `index_scene_markers_tags_on_scene_marker_id`;

CREATE INDEX `index_scene_markers_tags_on_tag_id` on `scene_markers_tags` (`tag_id`);
CREATE INDEX `index_scene_markers_tags_on_scene_marker_id` on `scene_markers_tags` (`scene_marker_id`);

CREATE TABLE `scenes_tags` (
  `scene_id` integer,
  `tag_id` integer,
  foreign key(`scene_id`) references `scenes`(`id`) on delete CASCADE,
  foreign key(`tag_id`) references `tags`(`id`)
);

DROP INDEX `index_scenes_tags_on_tag_id`;
DROP INDEX `index_scenes_tags_on_scene_id`;

CREATE INDEX `index_scenes_tags_on_tag_id` on `scenes_tags` (`tag_id`);
CREATE INDEX `index_scenes_tags_on_scene_id` on `scenes_tags` (`scene_id`);

CREATE TABLE `movies_scenes` (
  `movie_id` integer,
  `scene_id` integer,
  `scene_index` tinyint,
  foreign key(`movie_id`) references `movies`(`id`) on delete cascade,
  foreign key(`scene_id`) references `scenes`(`id`) on delete cascade
);

DROP INDEX `index_movies_scenes_on_movie_id`;
DROP INDEX `index_movies_scenes_on_scene_id`;

CREATE INDEX `index_movies_scenes_on_movie_id` on `movies_scenes` (`movie_id`);
CREATE INDEX `index_movies_scenes_on_scene_id` on `movies_scenes` (`scene_id`);

CREATE TABLE `scenes_cover` (
  `scene_id` integer,
  `cover` blob not null,
  foreign key(`scene_id`) references `scenes`(`id`) on delete CASCADE
);

DROP INDEX `index_scene_covers_on_scene_id`;

CREATE UNIQUE INDEX `index_scene_covers_on_scene_id` on `scenes_cover` (`scene_id`);

CREATE TABLE `scene_stash_ids` (
  `scene_id` integer,
  `endpoint` varchar(255),
  `stash_id` varchar(36),
  foreign key(`scene_id`) references `scenes`(`id`) on delete CASCADE
);

CREATE TABLE `galleries_images` (
  `gallery_id` integer,
  `image_id` integer,
  foreign key(`gallery_id`) references `galleries`(`id`) on delete CASCADE,
  foreign key(`image_id`) references `images`(`id`) on delete CASCADE
);

DROP INDEX `index_galleries_images_on_image_id`;
DROP INDEX `index_galleries_images_on_gallery_id`;

CREATE INDEX `index_galleries_images_on_image_id` on `galleries_images` (`image_id`);
CREATE INDEX `index_galleries_images_on_gallery_id` on `galleries_images` (`gallery_id`);

CREATE TABLE `performers_galleries` (
  `performer_id` integer,
  `gallery_id` integer,
  foreign key(`performer_id`) references `performers`(`id`) on delete CASCADE,
  foreign key(`gallery_id`) references `galleries`(`id`) on delete CASCADE
);

DROP INDEX `index_performers_galleries_on_gallery_id`;
DROP INDEX `index_performers_galleries_on_performer_id`;

CREATE INDEX `index_performers_galleries_on_gallery_id` on `performers_galleries` (`gallery_id`);
CREATE INDEX `index_performers_galleries_on_performer_id` on `performers_galleries` (`performer_id`);

CREATE TABLE `galleries_tags` (
  `gallery_id` integer,
  `tag_id` integer,
  foreign key(`gallery_id`) references `galleries`(`id`) on delete CASCADE,
  foreign key(`tag_id`) references `tags`(`id`) on delete CASCADE
);

DROP INDEX `index_galleries_tags_on_tag_id`;
DROP INDEX `index_galleries_tags_on_gallery_id`;

CREATE INDEX `index_galleries_tags_on_tag_id` on `galleries_tags` (`tag_id`);
CREATE INDEX `index_galleries_tags_on_gallery_id` on `galleries_tags` (`gallery_id`);

CREATE TABLE `performers_images` (
  `performer_id` integer,
  `image_id` integer,
  foreign key(`performer_id`) references `performers`(`id`) on delete CASCADE,
  foreign key(`image_id`) references `images`(`id`) on delete CASCADE
);

DROP INDEX `index_performers_images_on_image_id`;
DROP INDEX `index_performers_images_on_performer_id`;

CREATE INDEX `index_performers_images_on_image_id` on `performers_images` (`image_id`);
CREATE INDEX `index_performers_images_on_performer_id` on `performers_images` (`performer_id`);

CREATE TABLE `images_tags` (
  `image_id` integer,
  `tag_id` integer,
  foreign key(`image_id`) references `images`(`id`) on delete CASCADE,
  foreign key(`tag_id`) references `tags`(`id`) on delete CASCADE
);

DROP INDEX `index_performers_images_on_image_id`;
DROP INDEX `index_performers_images_on_performer_id`;

CREATE INDEX `index_images_tags_on_tag_id` on `images_tags` (`tag_id`);
CREATE INDEX `index_images_tags_on_image_id` on `images_tags` (`image_id`);

-- populate scenes, then scene files
INSERT INTO `scenes`
  (
    `id`,
    `title`,
    `details`,
    `url`,
    `date`,
    `rating`,
    `studio_id`,
    `o_counter`,
    `created_at`,
    `updated_at`
  )
  SELECT 
    `id`,
    `title`,
    `details`,
    `url`,
    `date`,
    `rating`,
    `studio_id`,
    `o_counter`,
    `created_at`,
    `updated_at`
  FROM `_scenes_old`;

INSERT INTO `scenes_files`
 (
  `scene_id`,
  `file_id`,
  `primary`
 )
 SELECT
  `_scenes_old.id`,
  `files.id`,
  '1',
 FROM `_scenes_old`
 INNER JOIN `files` ON `_scenes_old.path` = `files.path`;

-- populate images, then image files
INSERT INTO `images`
  (
    `id`,
    `title`, 
    `rating`,
    `studio_id`,
    `o_counter`,
    `created_at`,
    `updated_at`
  )
  SELECT 
    `id`,
    `title`, 
    `rating`,
    `studio_id`,
    `o_counter`,
    `created_at`,
    `updated_at`
  FROM `_images_old`;

INSERT INTO `images_files`
 (
  `image_id`,
  `file_id`,
  `primary`
 )
 SELECT
  `_images_old.id`,
  `files.id`,
  '1'
 FROM `_images_old`
 INNER JOIN `files` ON `_images_old.path` = `files.path`;

-- populate galleries, then gallery files
INSERT INTO `galleries`
  (
    `id`,
    `zip`,
    `title`,
    `url`,
    `date`,
    `details`,
    `studio_id`,
    `rating`,
    `scene_id`,
    `created_at`,
    `updated_at`,
  )
  SELECT 
    `id`,
    `zip`,
    `title`,
    `url`,
    `date`,
    `details`,
    `studio_id`,
    `rating`,
    `scene_id`,
    `created_at`,
    `updated_at`
  FROM `_galleries_old`;

INSERT INTO `galleries_files`
 (
  `gallery_id`,
  `file_id`,
  `primary`
 )
 SELECT
  `_galleries_old.id`,
  `files.id`,
  '1'
 FROM `_galleries_old`
 INNER JOIN `files` ON `_galleries_old.path` = `files.path`;

-- these tables are a direct copy
INSERT INTO `performers_scenes` select * from `_performers_scenes_old`;
INSERT INTO `scene_markers` select * from `_scene_markers_old`;
INSERT INTO `scene_markers_tags` select * from `_scene_markers_tags_old`;
INSERT INTO `scenes_tags` select * from `_scenes_tags_old`;
INSERT INTO `movies_scenes` select * from `_movies_scenes_old`;
INSERT INTO `scenes_cover` select * from `_scenes_cover_old`;
INSERT INTO `scene_stash_ids` select * from `_scene_stash_ids`;
INSERT INTO `galleries_images` select * from `_galleries_images`;
INSERT INTO `galleries_tags` select * from `_galleries_tags`;
INSERT INTO `performers_galleries` select * from `_performers_galleries`;
INSERT INTO `performers_images` select * from `_performers_images`;
INSERT INTO `images_tags` select * from `_images_tags`;

-- drop the old tables
DROP TABLE `scenes`;
DROP TABLE `galleries`;
DROP TABLE `images`;
DROP TABLE `performers_scenes`;
DROP TABLE `scene_markers`;
DROP TABLE `scene_markers_tags`;
DROP TABLE `scenes_tags`;
DROP TABLE `movies_scenes`;
DROP TABLE `scenes_cover`;
DROP TABLE `scene_stash_ids`;
DROP TABLE `galleries_images`;
DROP TABLE `galleries_tags`;
DROP TABLE `performers_galleries`;
DROP TABLE `performers_images`;
DROP TABLE `images_tags`;
