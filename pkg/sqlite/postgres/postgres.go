package postgres

import (
	"fmt"

	"github.com/jmoiron/sqlx"

	"github.com/golang-migrate/migrate/v4/database"
	postgresmig "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source"

	// postgres driver
	_ "github.com/lib/pq"
)

type Driver struct{}

func (d *Driver) Open(path string, disableForeignKeys bool) (*sqlx.DB, error) {
	conn, err := sqlx.Open("postgres", path)
	if err != nil {
		return nil, fmt.Errorf("db.Open(): %w", err)
	}

	return conn, nil
}

func (d *Driver) MigrateDriver(conn *sqlx.DB) (database.Driver, error) {
	return postgresmig.WithInstance(conn.DB, &postgresmig.Config{})
}

func (d *Driver) MigrationSource(src source.Driver) source.Driver {
	return &sourceDriver{src}
}
