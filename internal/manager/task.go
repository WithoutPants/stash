package manager

import (
	"context"

	"github.com/stashapp/stash/pkg/job"
)

type Task interface {
	Start(context.Context)
	GetDescription() string
}

type TaskQueueJob struct {
	TaskQueue *job.TaskQueue
}

func (t *TaskQueueJob) Execute(ctx context.Context, p *job.Progress) error {
	t.TaskQueue.Progress = p

	p.SetTotal(t.TaskQueue.Len())
	t.TaskQueue.OnTaskComplete = func() { p.Increment() }

	t.TaskQueue.Start(ctx)
	t.TaskQueue.Close()
	return nil
}
