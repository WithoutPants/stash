package sqlite

import (
	"github.com/golang-migrate/migrate/v4/database"
	sqlite3mig "github.com/golang-migrate/migrate/v4/database/sqlite3"
	"github.com/golang-migrate/migrate/v4/source"
	"github.com/jmoiron/sqlx"
)

type Driver struct{}

func (d *Driver) Open(path string, disableForeignKeys bool) (*sqlx.DB, error) {
	// https://github.com/mattn/go-sqlite3
	url := "file:" + path + "?_journal=WAL&_sync=NORMAL&_busy_timeout=50"
	if !disableForeignKeys {
		url += "&_fk=true"
	}

	return sqlx.Open(sqlite3Driver, url)
}

func (d *Driver) MigrateDriver(conn *sqlx.DB) (database.Driver, error) {
	return sqlite3mig.WithInstance(conn.DB, &sqlite3mig.Config{})
}

func (d *Driver) MigrationSource(src source.Driver) source.Driver {
	return src
}
