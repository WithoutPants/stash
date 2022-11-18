//go:build integration
// +build integration

package sqlite_test

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/stashapp/stash/pkg/models"
	"github.com/stashapp/stash/pkg/txn"
)

func TestConcurrentExclusiveTxn(t *testing.T) {
	const workers = 8
	const loops = 200
	const innerLoops = 10
	ctx := context.Background()

	var wg sync.WaitGroup
	for k := 0; k < workers; k++ {
		wg.Add(1)
		go func(wk int) {
			for l := 0; l < loops; l++ {
				// change this to WithReadTxn to see locked database error
				if err := txn.WithTxn(ctx, db, func(ctx context.Context) error {
					for ll := 0; ll < innerLoops; ll++ {
						scene := &models.Scene{
							Title: "test",
						}

						if err := db.Scene.Create(ctx, scene, nil); err != nil {
							return err
						}

						if err := db.Scene.Destroy(ctx, scene.ID); err != nil {
							return err
						}
					}
					time.Sleep(time.Millisecond * 1)

					return nil
				}); err != nil {
					t.Errorf("worker %d loop %d: %v", wk, l, err)
				}
			}

			wg.Done()
		}(k)
	}

	wg.Wait()
}

func TestConcurrentReadTxn(t *testing.T) {
	var wg sync.WaitGroup
	ctx := context.Background()
	c := make(chan struct{}, 1)

	// first thread
	wg.Add(2)
	go func() {
		defer wg.Done()
		if err := txn.WithReadTxn(ctx, db, func(ctx context.Context) error {
			scene := &models.Scene{
				Title: "test",
			}

			if err := db.Scene.Create(ctx, scene, nil); err != nil {
				return err
			}

			// wait for other thread to start
			c <- struct{}{}
			<-c

			if err := db.Scene.Destroy(ctx, scene.ID); err != nil {
				return err
			}

			return nil
		}); err != nil {
			t.Errorf("unexpected error in first thread: %v", err)
		}
	}()

	// second thread
	go func() {
		defer wg.Done()
		_ = txn.WithReadTxn(ctx, db, func(ctx context.Context) error {
			// wait for first thread
			<-c
			defer func() {
				c <- struct{}{}
			}()

			scene := &models.Scene{
				Title: "test",
			}

			// expect error when we try to do this, as the other thread has already
			// modified this table
			if err := db.Scene.Create(ctx, scene, nil); err != nil {
				if !db.IsLocked(err) {
					t.Errorf("unexpected error: %v", err)
				}
				return err
			} else {
				t.Errorf("expected locked error in second thread")
			}

			return nil
		})
	}()

	wg.Wait()
}
