package database

import (
	"bytes"
	"fmt"
	"io"
	"io/ioutil"
	"os"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/source"
	"github.com/markbates/pkger"
)

type Packr2Source struct {
	Box        string
	Migrations *source.Migrations
}

func init() {
	source.Register("packr2", &Packr2Source{})
}

func WithInstance(instance *Packr2Source) (source.Driver, error) {
	dir, err := pkger.Open(instance.Box)
	if err != nil {
		return nil, err
	}
	defer dir.Close()

	files, err := dir.Readdir(0)
	if err != nil {
		return nil, err
	}

	for _, fi := range files {
		m, err := source.DefaultParse(fi.Name())
		if err != nil {
			continue // ignore files that we can't parse
		}

		if !instance.Migrations.Append(m) {
			return nil, fmt.Errorf("unable to parse file %v", fi)
		}
	}

	return instance, nil
}

func (s *Packr2Source) Open(url string) (source.Driver, error) {
	return nil, fmt.Errorf("not implemented")
}

func (s *Packr2Source) Close() error {
	s.Migrations = nil
	return nil
}

func (s *Packr2Source) First() (version uint, err error) {
	if v, ok := s.Migrations.First(); !ok {
		return 0, os.ErrNotExist
	} else {
		return v, nil
	}
}

func (s *Packr2Source) Prev(version uint) (prevVersion uint, err error) {
	if v, ok := s.Migrations.Prev(version); !ok {
		return 0, os.ErrNotExist
	} else {
		return v, nil
	}
}

func (s *Packr2Source) Next(version uint) (nextVersion uint, err error) {
	if v, ok := s.Migrations.Next(version); !ok {
		return 0, os.ErrNotExist
	} else {
		return v, nil
	}
}

func (s *Packr2Source) ReadUp(version uint) (r io.ReadCloser, identifier string, err error) {
	if migration, ok := s.Migrations.Up(version); !ok {
		return nil, "", os.ErrNotExist
	} else {
		f, _ := pkger.Open(s.Box + migration.Raw)
		defer f.Close()
		b, _ := ioutil.ReadAll(f)

		return ioutil.NopCloser(bytes.NewBuffer(b)),
			migration.Identifier,
			nil
	}
}

func (s *Packr2Source) ReadDown(version uint) (r io.ReadCloser, identifier string, err error) {
	if migration, ok := s.Migrations.Down(version); !ok {
		return nil, "", migrate.ErrNilVersion
	} else {
		f, _ := pkger.Open(s.Box + migration.Raw)
		defer f.Close()
		b, _ := ioutil.ReadAll(f)

		return ioutil.NopCloser(bytes.NewBuffer(b)),
			migration.Identifier,
			nil
	}
}
