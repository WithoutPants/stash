package postgres

import (
	"embed"
	"errors"
	"io"
	"os"
	"regexp"
	"strings"

	"github.com/golang-migrate/migrate/v4/source"
)

//go:embed migrations/*.sql
var migrationsBox embed.FS

const minVersion = 48

type sourceDriver struct {
	source.Driver

	localDriver source.Driver
}

func (d *sourceDriver) First() (version uint, err error) {
	return minVersion, nil
}

func (d *sourceDriver) ReadUp(version uint) (r io.ReadCloser, identifier string, err error) {
	// try to read from local migrations first
	r, identifier, err = d.localDriver.ReadUp(version)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return nil, "", err
	}

	if err == nil {
		return r, identifier, nil
	}

	// fallback to the sqlite migrations
	r, identifier, err = d.Driver.ReadUp(version)
	if err != nil {
		return nil, "", err
	}

	r = d.translateMigration(r)

	return r, identifier, nil
}

func (d *sourceDriver) ReadDown(version uint) (r io.ReadCloser, identifier string, err error) {
	// try to read from local migrations first
	r, identifier, err = d.localDriver.ReadDown(version)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return nil, "", err
	}

	if err == nil {
		return r, identifier, nil
	}

	// fallback to the sqlite migrations
	r, identifier, err = d.Driver.ReadDown(version)
	if err != nil {
		return nil, "", err
	}

	r = d.translateMigration(r)

	return r, identifier, nil
}

func (d *sourceDriver) translateMigration(r io.ReadCloser) io.ReadCloser {
	var buf strings.Builder
	_, _ = io.Copy(&buf, r)
	r.Close()

	s := buf.String()

	// translate sqlite related things to postgres
	s = d.translateRE(s, "integer (.*) autoincrement", "serial $1")
	s = d.translateRE(s, "datetime", "timestamp")
	s = d.translateRE(s, "tinyint", "smallint")
	// add space prefix to avoid matching fields
	s = d.translateRE(s, " blob", " bytea")

	return io.NopCloser(strings.NewReader(s))
}

func (d *sourceDriver) translateRE(src string, re string, repl string) string {
	return regexp.MustCompile(re).ReplaceAllString(src, repl)
}
