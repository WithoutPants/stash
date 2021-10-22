package manager

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	"github.com/stashapp/stash/pkg/identify"
	"github.com/stashapp/stash/pkg/job"
	"github.com/stashapp/stash/pkg/logger"
	"github.com/stashapp/stash/pkg/models"
	"github.com/stashapp/stash/pkg/scene"
	"github.com/stashapp/stash/pkg/scraper"
	"github.com/stashapp/stash/pkg/scraper/stashbox"
	"github.com/stashapp/stash/pkg/utils"
)

var ErrInput = errors.New("invalid request input")

type IdentifyJob struct {
	txnManager models.TransactionManager
	input      models.IdentifyMetadataInput

	stashBoxes models.StashBoxes
	progress   *job.Progress
}

func CreateIdentifyJob(input models.IdentifyMetadataInput) *IdentifyJob {
	return &IdentifyJob{
		txnManager: instance.TxnManager,
		input:      input,
		stashBoxes: instance.Config.GetStashBoxes(),
	}
}

func (j *IdentifyJob) Execute(ctx context.Context, progress *job.Progress) {
	j.progress = progress

	// if no sources provided - just return
	if len(j.input.Sources) == 0 {
		return
	}

	sources, err := j.getSources()
	if err != nil {
		logger.Error(err)
		return
	}

	// if scene ids provided, use those
	// otherwise, batch query for all scenes - ordering by path
	if err := j.txnManager.WithReadTxn(ctx, func(r models.ReaderRepository) error {
		if len(j.input.SceneIDs) == 0 {
			return j.identifyAllScenes(ctx, r, sources)
		}

		sceneIDs, err := utils.StringSliceToIntSlice(j.input.SceneIDs)
		if err != nil {
			return fmt.Errorf("invalid scene IDs: %w", err)
		}

		progress.SetTotal(len(sceneIDs))
		for _, id := range sceneIDs {
			if job.IsCancelled(ctx) {
				break
			}

			// find the scene
			var err error
			scene, err := r.Scene().Find(id)
			if err != nil {
				return fmt.Errorf("error finding scene with id %d: %w", id, err)
			}

			if scene == nil {
				return fmt.Errorf("no scene found with id %d", id)
			}

			j.identifyScene(ctx, scene, sources)
		}

		return nil
	}); err != nil {
		logger.Errorf("Error encountered while identifying scenes: %v", err)
	}
}

func (j *IdentifyJob) identifyAllScenes(ctx context.Context, r models.ReaderRepository, sources []identify.ScraperSource) error {
	// exclude organised
	organised := false
	sceneFilter := scene.FilterFromPaths(j.input.Paths)
	sceneFilter.Organized = &organised

	sort := "path"
	findFilter := &models.FindFilterType{
		Sort: &sort,
	}

	// get the count
	pp := 0
	findFilter.PerPage = &pp
	_, count, err := r.Scene().Query(sceneFilter, findFilter)
	if err != nil {
		return fmt.Errorf("error getting scene count: %w", err)
	}

	j.progress.SetTotal(count)

	return scene.BatchProcess(ctx, r.Scene(), sceneFilter, findFilter, func(scene *models.Scene) error {
		if job.IsCancelled(ctx) {
			return nil
		}

		j.identifyScene(ctx, scene, sources)
		return nil
	})
}

func (j *IdentifyJob) identifyScene(ctx context.Context, s *models.Scene, sources []identify.ScraperSource) {
	if job.IsCancelled(ctx) {
		return
	}

	if err := j.txnManager.WithTxn(context.TODO(), func(r models.Repository) error {
		var taskError error
		j.progress.ExecuteTask("Identifying "+s.Path, func() {
			task := identify.SceneIdentifier{
				DefaultOptions: j.input.Options,
				Sources:        sources,
				ScreenshotSetter: &scene.PathsScreenshotSetter{
					Paths:               instance.Paths,
					FileNamingAlgorithm: instance.Config.GetVideoFileNamingAlgorithm(),
				},
			}

			taskError = task.Identify(ctx, r, s)
		})

		return taskError
	}); err != nil {
		logger.Errorf("Error encountered identifying %s: %v", s.Path, err)
	}

	j.progress.Increment()
}

func (j *IdentifyJob) getSources() ([]identify.ScraperSource, error) {
	var ret []identify.ScraperSource
	for _, source := range j.input.Sources {
		// get scraper source
		stashBox, err := j.getStashBox(source.Source)
		if err != nil {
			return nil, err
		}

		var src identify.ScraperSource
		if stashBox != nil {
			src = identify.ScraperSource{
				Name: "stash-box: " + stashBox.Endpoint,
				Scraper: stashboxSource{
					stashbox.NewClient(*stashBox, j.txnManager),
					stashBox.Endpoint,
				},
				RemoteSite: stashBox.Endpoint,
			}
		} else {
			scraperID := *source.Source.ScraperID
			s := instance.ScraperCache.GetScraper(scraperID)
			if s == nil {
				return nil, fmt.Errorf("%w: scraper with id %q", models.ErrNotFound, scraperID)
			}
			src = identify.ScraperSource{
				Name: s.Name,
				Scraper: scraperSource{
					cache:     instance.ScraperCache,
					scraperID: scraperID,
				},
			}
		}

		src.Options = source.Options
		ret = append(ret, src)
	}

	return ret, nil
}

func (j *IdentifyJob) getStashBox(src *models.ScraperSourceInput) (*models.StashBox, error) {
	if src.ScraperID != nil {
		return nil, nil
	}

	// must be stash-box
	if src.StashBoxIndex == nil && src.StashBoxEndpoint == nil {
		return nil, fmt.Errorf("%w: stash_box_index or stash_box_endpoint or scraper_id must be set", ErrInput)
	}

	return j.stashBoxes.ResolveStashBox(*src)
}

type stashboxSource struct {
	*stashbox.Client
	endpoint string
}

func (s stashboxSource) ScrapeScene(sceneID int) (*models.ScrapedScene, error) {
	results, err := s.FindStashBoxScenesByFingerprintsFlat([]string{strconv.Itoa(sceneID)})
	if err != nil {
		return nil, fmt.Errorf("error querying stash-box using scene ID %d: %w", sceneID, err)
	}

	if len(results) > 0 {
		return results[0], nil
	}

	return nil, nil
}

func (s stashboxSource) String() string {
	return fmt.Sprintf("stash-box %s", s.endpoint)
}

type scraperSource struct {
	cache     *scraper.Cache
	scraperID string
}

func (s scraperSource) ScrapeScene(sceneID int) (*models.ScrapedScene, error) {
	return s.cache.ScrapeScene(s.scraperID, sceneID)
}

func (s scraperSource) String() string {
	return fmt.Sprintf("scraper %s", s.scraperID)
}
