//go:build integration
// +build integration

package database_test

import (
	"context"
	"os"
	"testing"

	"github.com/stashapp/stash/pkg/database"
)

func TestAnonymiser_Anonymise(t *testing.T) {
	f, err := os.CreateTemp("", "*.sqlite")
	if err != nil {
		t.Errorf("Could not create temporary file: %v", err)
		return
	}

	f.Close()
	defer os.Remove(f.Name())

	// use existing database
	anonymiser, err := database.NewAnonymiser(db, f.Name())
	if err != nil {
		t.Errorf("Could not create anonymiser: %v", err)
		return
	}

	if err := anonymiser.Anonymise(context.Background()); err != nil {
		t.Errorf("Could not anonymise: %v", err)
		return
	}

	t.Logf("Anonymised database written to %s", f.Name())

	// TODO - ensure anonymous
}
