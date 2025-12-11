package api

import (
	"context"
	"fmt"
	"os"
	"strconv"

	"github.com/stashapp/stash/internal/manager"
	"github.com/stashapp/stash/internal/manager/task"
	"github.com/stashapp/stash/pkg/logger"
)

func (r *mutationResolver) DownloadUpdate(ctx context.Context) (string, error) {
	mgr := manager.GetInstance()
	paths := mgr.Paths

	rel, err := GetLatestRelease(ctx)
	if err != nil {
		logger.Errorf("error getting latest release: %v", err)
		return "", err
	}

	t := &task.DownloadJob{
		DestinationDirectory: paths.Generated.Tmp,
		URL:                  rel.Url,
	}

	t.OnComplete = func(ctx context.Context) {
		mgr.UpdatePath = t.DownloadedPath
	}

	jobID := mgr.JobManager.Add(ctx, "Downloading update...", t)

	return strconv.Itoa(jobID), nil
}

func (r *mutationResolver) InstallUpdate(ctx context.Context) (string, error) {
	mgr := manager.GetInstance()

	if mgr.UpdatePath == "" {
		return "", fmt.Errorf("no update found")
	}

	// replace the executable
	currentExec, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("could not get current executable: %w", err)
	}

	backupPath := currentExec + ".bak"
	// remove any existing backup
	_ = os.Remove(backupPath)

	err = os.Rename(currentExec, backupPath)
	if err != nil {
		return "", fmt.Errorf("could not backup current executable: %w", err)
	}

	if err := os.Rename(mgr.UpdatePath, currentExec); err != nil {
		// attempt to restore backup
		_ = os.Rename(backupPath, currentExec)
		return "", fmt.Errorf("could not install update: %w", err)
	}

	// set permissions
	if err := os.Chmod(currentExec, 0755); err != nil {
		logger.Warnf("could not set executable permissions on new executable: %v", err)
	}

	// trigger restart
	r.server.TriggerRestart(currentExec)
	return "", nil
}
