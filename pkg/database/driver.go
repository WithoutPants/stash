package database

import (
	"github.com/golang-migrate/migrate/v4/database"
	"github.com/golang-migrate/migrate/v4/source"
	"github.com/jmoiron/sqlx"
)

type Driver interface {
	Open(path string, disableForeignKeys bool) (*sqlx.DB, error)
	MigrateDriver(conn *sqlx.DB) (database.Driver, error)
	MigrationSource(src source.Driver) source.Driver
}
