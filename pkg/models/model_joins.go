package models

import "database/sql"

type MoviesScenes struct {
	MovieID    int           `db:"movie_id" json:"movie_id"`
	SceneID    int           `db:"scene_id" json:"scene_id"`
	SceneIndex sql.NullInt64 `db:"scene_index" json:"scene_index"`
}

type StashID struct {
	StashID  string `db:"stash_id" json:"stash_id"`
	Endpoint string `db:"endpoint" json:"endpoint"`
}

type ScenesFiles struct {
	SceneID int `db:"scene_id" json:"scene_id"`
	FileID  int `db:"file_id" json:"file_id"`
}

type ImagesFiles struct {
	ImageID int `db:"image_id" json:"image_id"`
	FileID  int `db:"file_id" json:"file_id"`
}

type GalleriesFiles struct {
	GalleryID int `db:"gallery_id" json:"gallery_id"`
	FileID    int `db:"file_id" json:"file_id"`
}
