package models

import (
	"database/sql"
)

// File stores the metadata for a single file.
type File struct {
	ID          int                 `db:"id" json:"id"`
	Checksum    sql.NullString      `db:"checksum" json:"checksum"`
	OSHash      sql.NullString      `db:"oshash" json:"oshash"`
	Path        string              `db:"path" json:"path"`
	Size        sql.NullString      `db:"size" json:"size"`
	Duration    sql.NullFloat64     `db:"duration" json:"duration"`
	VideoCodec  sql.NullString      `db:"video_codec" json:"video_codec"`
	Format      sql.NullString      `db:"format" json:"format_name"`
	AudioCodec  sql.NullString      `db:"audio_codec" json:"audio_codec"`
	Width       sql.NullInt64       `db:"width" json:"width"`
	Height      sql.NullInt64       `db:"height" json:"height"`
	Framerate   sql.NullFloat64     `db:"framerate" json:"framerate"`
	Bitrate     sql.NullInt64       `db:"bitrate" json:"bitrate"`
	FileModTime NullSQLiteTimestamp `db:"file_mod_time" json:"file_mod_time"`
	CreatedAt   SQLiteTimestamp     `db:"created_at" json:"created_at"`
	UpdatedAt   SQLiteTimestamp     `db:"updated_at" json:"updated_at"`
}

type FilePartial struct {
	ID          int                  `db:"id" json:"id"`
	Checksum    *sql.NullString      `db:"checksum" json:"checksum"`
	OSHash      *sql.NullString      `db:"oshash" json:"oshash"`
	Path        *string              `db:"path" json:"path"`
	Size        *sql.NullString      `db:"size" json:"size"`
	Duration    *sql.NullFloat64     `db:"duration" json:"duration"`
	VideoCodec  *sql.NullString      `db:"video_codec" json:"video_codec"`
	Format      *sql.NullString      `db:"format" json:"format_name"`
	AudioCodec  *sql.NullString      `db:"audio_codec" json:"audio_codec"`
	Width       *sql.NullInt64       `db:"width" json:"width"`
	Height      *sql.NullInt64       `db:"height" json:"height"`
	Framerate   *sql.NullFloat64     `db:"framerate" json:"framerate"`
	Bitrate     *sql.NullInt64       `db:"bitrate" json:"bitrate"`
	FileModTime *NullSQLiteTimestamp `db:"file_mod_time" json:"file_mod_time"`
	CreatedAt   *SQLiteTimestamp     `db:"created_at" json:"created_at"`
	UpdatedAt   *SQLiteTimestamp     `db:"updated_at" json:"updated_at"`
}

// GetHash returns the hash of the scene, based on the hash algorithm provided. If
// hash algorithm is MD5, then Checksum is returned. Otherwise, OSHash is returned.
func (s File) GetHash(hashAlgorithm HashAlgorithm) string {
	if hashAlgorithm == HashAlgorithmMd5 {
		return s.Checksum.String
	} else if hashAlgorithm == HashAlgorithmOshash {
		return s.OSHash.String
	}

	panic("unknown hash algorithm")
}
