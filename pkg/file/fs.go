package file

import (
	"io"
	"io/fs"
	"os"
)

// Opener provides an interface to open a file.
type Opener interface {
	Open() (io.ReadCloser, error)
}

type fsOpener struct {
	fs   FS
	name string
}

func (o *fsOpener) Open() (io.ReadCloser, error) {
	return o.fs.Open(o.name)
}

// FS represents a file system.
type FS interface {
	Lstat(name string) (fs.FileInfo, error)
	Open(name string) (fs.ReadDirFile, error)
}

// OsFS is a file system backed by the OS.
type OsFS struct{}

func (f *OsFS) Lstat(name string) (fs.FileInfo, error) {
	return os.Lstat(name)
}

func (f *OsFS) Open(name string) (fs.ReadDirFile, error) {
	return os.Open(name)
}
