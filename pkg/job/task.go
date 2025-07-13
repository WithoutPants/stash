package job

import (
	"context"

	"github.com/remeh/sizedwaitgroup"
)

type taskExec struct {
	task
	fn func(ctx context.Context)
}

type TaskQueue struct {
	Progress       *Progress
	OnTaskComplete func()
	wg             sizedwaitgroup.SizedWaitGroup
	tasks          chan taskExec
	done           chan struct{}
}

func CreateAndStartTaskQueue(ctx context.Context, p *Progress, queueSize int, processes int) *TaskQueue {
	ret := CreateTaskQueue(ctx, p, queueSize, processes)

	ret.Start(ctx)

	return ret
}

func CreateTaskQueue(ctx context.Context, p *Progress, queueSize int, processes int) *TaskQueue {
	ret := &TaskQueue{
		Progress: p,
		wg:       sizedwaitgroup.New(processes),
		tasks:    make(chan taskExec, queueSize),
	}

	return ret
}

// Start will start the executor goroutine if it is not already started
// This is not thread-safe!
func (tq *TaskQueue) Start(ctx context.Context) {
	if tq.done != nil {
		return
	}

	tq.done = make(chan struct{})
	go tq.executer(ctx)
}

func (tq *TaskQueue) Add(description string, fn func(ctx context.Context)) {
	tq.tasks <- taskExec{
		task: task{
			description: description,
		},
		fn: fn,
	}
}

func (tq *TaskQueue) Len() int {
	return len(tq.tasks)
}

func (tq *TaskQueue) Close() {
	close(tq.tasks)
	// wait for all tasks to finish
	<-tq.done
}

func (tq *TaskQueue) executer(ctx context.Context) {
	defer close(tq.done)
	defer tq.wg.Wait()
	for task := range tq.tasks {
		if IsCancelled(ctx) {
			return
		}

		tt := task

		tq.wg.Add()
		go func() {
			defer tq.wg.Done()
			defer tq.OnTaskComplete()
			tq.Progress.ExecuteTask(tt.description, func() {
				tt.fn(ctx)
			})
		}()
	}
}
