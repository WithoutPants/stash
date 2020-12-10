package models

import (
	"database/sql"
)

// Scene stores the metadata for a single video scene.
type Scene struct {
	ID        int             `db:"id" json:"id"`
	Title     sql.NullString  `db:"title" json:"title"`
	Details   sql.NullString  `db:"details" json:"details"`
	URL       sql.NullString  `db:"url" json:"url"`
	Date      SQLiteDate      `db:"date" json:"date"`
	Rating    sql.NullInt64   `db:"rating" json:"rating"`
	Organized bool            `db:"organized" json:"organized"`
	OCounter  int             `db:"o_counter" json:"o_counter"`
	StudioID  sql.NullInt64   `db:"studio_id,omitempty" json:"studio_id"`
	CreatedAt SQLiteTimestamp `db:"created_at" json:"created_at"`
	UpdatedAt SQLiteTimestamp `db:"updated_at" json:"updated_at"`
}

// ScenePartial represents part of a Scene object. It is used to update
// the database entry. Only non-nil fields will be updated.
type ScenePartial struct {
	ID        int              `db:"id" json:"id"`
	Title     *sql.NullString  `db:"title" json:"title"`
	Details   *sql.NullString  `db:"details" json:"details"`
	URL       *sql.NullString  `db:"url" json:"url"`
	Date      *SQLiteDate      `db:"date" json:"date"`
	Rating    *sql.NullInt64   `db:"rating" json:"rating"`
	Organized *bool            `db:"organized" json:"organized"`
	StudioID  *sql.NullInt64   `db:"studio_id,omitempty" json:"studio_id"`
	MovieID   *sql.NullInt64   `db:"movie_id,omitempty" json:"movie_id"`
	CreatedAt *SQLiteTimestamp `db:"created_at" json:"created_at"`
	UpdatedAt *SQLiteTimestamp `db:"updated_at" json:"updated_at"`
}

// SceneFileType represents the file metadata for a scene.
type SceneFileType struct {
	Size       *string  `graphql:"size" json:"size"`
	Duration   *float64 `graphql:"duration" json:"duration"`
	VideoCodec *string  `graphql:"video_codec" json:"video_codec"`
	AudioCodec *string  `graphql:"audio_codec" json:"audio_codec"`
	Width      *int     `graphql:"width" json:"width"`
	Height     *int     `graphql:"height" json:"height"`
	Framerate  *float64 `graphql:"framerate" json:"framerate"`
	Bitrate    *int     `graphql:"bitrate" json:"bitrate"`
}

type Scenes []*Scene

func (s *Scenes) Append(o interface{}) {
	*s = append(*s, o.(*Scene))
}

func (s *Scenes) New() interface{} {
	return &Scene{}
}
