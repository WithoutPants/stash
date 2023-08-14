package postgres

import (
	"io"
	"regexp"
	"strings"

	"github.com/golang-migrate/migrate/v4/source"
)

type sourceDriver struct {
	source.Driver
}

func (d *sourceDriver) ReadUp(version uint) (r io.ReadCloser, identifier string, err error) {
	r, identifier, err = d.Driver.ReadUp(version)
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
