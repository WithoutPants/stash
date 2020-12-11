package models

type FileReader interface {
	Find(id int) (*File, error)
	FindMany(ids []int) ([]*File, error)
	FindByChecksum(checksum string) (*File, error)
	FindByOSHash(oshash string) (*File, error)
	FindByPath(path string) (*File, error)
	Count() (int, error)
	Size() (float64, error)
	// SizeCount() (string, error)
	CountMissingChecksum() (int, error)
	CountMissingOSHash() (int, error)
	Query(FileFilter *FileFilterType, findFilter *FindFilterType) ([]*File, int, error)
}

type FileWriter interface {
	Create(newFile File) (*File, error)
	Update(updatedFile FilePartial) (*File, error)
	UpdateFull(updatedFile File) (*File, error)
	UpdateModTime(id int, modTime NullSQLiteTimestamp) error
	Destroy(id int) error
}

type FileReaderWriter interface {
	FileReader
	FileWriter
}
