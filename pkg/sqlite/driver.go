package sqlite

import (
	"github.com/golang-migrate/migrate/v4/database"
	"github.com/jmoiron/sqlx"
)

type Driver interface {
	Open(path string, disableForeignKeys bool) (*sqlx.DB, error)
	MigrateDriver(conn *sqlx.DB) (database.Driver, error)
}
