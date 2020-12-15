package api

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"time"

	"github.com/stashapp/stash/pkg/database"
	"github.com/stashapp/stash/pkg/manager"
	"github.com/stashapp/stash/pkg/manager/config"
	"github.com/stashapp/stash/pkg/models"
	"github.com/stashapp/stash/pkg/sqlite"
	"github.com/stashapp/stash/pkg/utils"
)

func (r *mutationResolver) SceneUpdate(ctx context.Context, input models.SceneUpdateInput) (ret *models.Scene, err error) {
	translator := changesetTranslator{
		inputMap: getUpdateInputMap(ctx),
	}

	// Start the transaction and save the scene
	if err := r.withTxn(ctx, func(repo models.Repository) error {
		ret, err = r.sceneUpdate(input, translator, repo)
		return err
	}); err != nil {
		return nil, err
	}

	return ret, nil
}

func (r *mutationResolver) ScenesUpdate(ctx context.Context, input []*models.SceneUpdateInput) (ret []*models.Scene, err error) {
	inputMaps := getUpdateInputMaps(ctx)

	// Start the transaction and save the scene
	if err := r.withTxn(ctx, func(repo models.Repository) error {
		for i, scene := range input {
			translator := changesetTranslator{
				inputMap: inputMaps[i],
			}

			thisScene, err := r.sceneUpdate(*scene, translator, repo)
			ret = append(ret, thisScene)

			if err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return ret, nil
}

func (r *mutationResolver) sceneUpdate(input models.SceneUpdateInput, translator changesetTranslator, repo models.Repository) (*models.Scene, error) {
	// Populate scene from the input
	sceneID, err := strconv.Atoi(input.ID)
	if err != nil {
		return nil, err
	}

	var coverImageData []byte

	updatedTime := time.Now()
	updatedScene := models.ScenePartial{
		ID:        sceneID,
		UpdatedAt: &models.SQLiteTimestamp{Timestamp: updatedTime},
	}

	updatedScene.Title = translator.nullString(input.Title, "title")
	updatedScene.Details = translator.nullString(input.Details, "details")
	updatedScene.URL = translator.nullString(input.URL, "url")
	updatedScene.Date = translator.sqliteDate(input.Date, "date")
	updatedScene.Rating = translator.nullInt64(input.Rating, "rating")
	updatedScene.StudioID = translator.nullInt64FromString(input.StudioID, "studio_id")
	updatedScene.Organized = input.Organized

	if input.CoverImage != nil && *input.CoverImage != "" {
		var err error
		_, coverImageData, err = utils.ProcessBase64Image(*input.CoverImage)
		if err != nil {
			return nil, err
		}

		// update the cover after updating the scene
	}

	qb := repo.Scene()
	scene, err := qb.Update(updatedScene)
	if err != nil {
		return nil, err
	}

	// update cover table
	if len(coverImageData) > 0 {
		if err := qb.UpdateSceneCover(sceneID, coverImageData); err != nil {
			return nil, err
		}
	}

	// Clear the existing gallery value
	if translator.hasField("gallery_id") {
		gqb := repo.Gallery()
		err = gqb.ClearGalleryId(sceneID)
		if err != nil {
			return nil, err
		}

		if input.GalleryID != nil {
			// Save the gallery
			galleryID, _ := strconv.Atoi(*input.GalleryID)
			updatedGallery := models.GalleryPartial{
				ID:        galleryID,
				SceneID:   &sql.NullInt64{Int64: int64(sceneID), Valid: true},
				UpdatedAt: &models.SQLiteTimestamp{Timestamp: updatedTime},
			}
			_, err := gqb.UpdatePartial(updatedGallery)
			if err != nil {
				return nil, err
			}
		}
	}

	// Save the performers
	if translator.hasField("performer_ids") {
		if err := r.updateScenePerformers(qb, sceneID, input.PerformerIds); err != nil {
			return nil, err
		}
	}

	// Save the movies
	if translator.hasField("movies") {
		if err := r.updateSceneMovies(qb, sceneID, input.Movies); err != nil {
			return nil, err
		}
	}

	// Save the tags
	if translator.hasField("tag_ids") {
		if err := r.updateSceneTags(qb, sceneID, input.TagIds); err != nil {
			return nil, err
		}
	}

	// Save the stash_ids
	if translator.hasField("stash_ids") {
		stashIDJoins := models.StashIDsFromInput(input.StashIds)
		if err := qb.UpdateStashIDs(sceneID, stashIDJoins); err != nil {
			return nil, err
		}
	}

	// only update the cover image if provided and everything else was successful
	if coverImageData != nil {
		err = manager.SetSceneScreenshot(scene.GetHash(config.GetVideoFileNamingAlgorithm()), coverImageData)
		if err != nil {
			return nil, err
		}
	}

	return scene, nil
}

func (r *mutationResolver) updateScenePerformers(qb models.SceneReaderWriter, sceneID int, performerIDs []string) error {
	ids, err := utils.StringSliceToIntSlice(performerIDs)
	if err != nil {
		return err
	}
	return qb.UpdatePerformers(sceneID, ids)
}

func (r *mutationResolver) updateSceneMovies(qb models.SceneReaderWriter, sceneID int, movies []*models.SceneMovieInput) error {
	var movieJoins []models.MoviesScenes

	for _, movie := range movies {
		movieID, err := strconv.Atoi(movie.MovieID)
		if err != nil {
			return err
		}

		movieJoin := models.MoviesScenes{
			MovieID: movieID,
		}

		if movie.SceneIndex != nil {
			movieJoin.SceneIndex = sql.NullInt64{
				Int64: int64(*movie.SceneIndex),
				Valid: true,
			}
		}

		movieJoins = append(movieJoins, movieJoin)
	}

	return qb.UpdateMovies(sceneID, movieJoins)
}

func (r *mutationResolver) updateSceneTags(qb models.SceneReaderWriter, sceneID int, tagsIDs []string) error {
	ids, err := utils.StringSliceToIntSlice(tagsIDs)
	if err != nil {
		return err
	}
	return qb.UpdateTags(sceneID, ids)
}

func (r *mutationResolver) BulkSceneUpdate(ctx context.Context, input models.BulkSceneUpdateInput) ([]*models.Scene, error) {
	sceneIDs, err := utils.StringSliceToIntSlice(input.Ids)
	if err != nil {
		return nil, err
	}

	// Populate scene from the input
	updatedTime := time.Now()

	translator := changesetTranslator{
		inputMap: getUpdateInputMap(ctx),
	}

	updatedScene := models.ScenePartial{
		UpdatedAt: &models.SQLiteTimestamp{Timestamp: updatedTime},
	}

	updatedScene.Title = translator.nullString(input.Title, "title")
	updatedScene.Details = translator.nullString(input.Details, "details")
	updatedScene.URL = translator.nullString(input.URL, "url")
	updatedScene.Date = translator.sqliteDate(input.Date, "date")
	updatedScene.Rating = translator.nullInt64(input.Rating, "rating")
	updatedScene.StudioID = translator.nullInt64FromString(input.StudioID, "studio_id")
	updatedScene.Organized = input.Organized

	ret := []*models.Scene{}

	// Start the transaction and save the scene marker
	if err := r.withTxn(ctx, func(repo models.Repository) error {
		qb := repo.Scene()
		gqb := repo.Gallery()

		for _, sceneID := range sceneIDs {
			updatedScene.ID = sceneID

			scene, err := qb.Update(updatedScene)
			if err != nil {
				return err
			}

			ret = append(ret, scene)

			if translator.hasField("gallery_id") {
				// Save the gallery
				galleryID, _ := strconv.Atoi(*input.GalleryID)
				updatedGallery := models.GalleryPartial{
					ID:        galleryID,
					SceneID:   &sql.NullInt64{Int64: int64(sceneID), Valid: true},
					UpdatedAt: &models.SQLiteTimestamp{Timestamp: updatedTime},
				}

				if _, err := gqb.UpdatePartial(updatedGallery); err != nil {
					return err
				}
			}

			// Save the performers
			if translator.hasField("performer_ids") {
				performerIDs, err := adjustScenePerformerIDs(qb, sceneID, *input.PerformerIds)
				if err != nil {
					return err
				}

				if err := qb.UpdatePerformers(sceneID, performerIDs); err != nil {
					return err
				}
			}

			// Save the tags
			if translator.hasField("tag_ids") {
				tagIDs, err := adjustSceneTagIDs(qb, sceneID, *input.TagIds)
				if err != nil {
					return err
				}

				if err := qb.UpdateTags(sceneID, tagIDs); err != nil {
					return err
				}
			}
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return ret, nil
}

func adjustIDs(existingIDs []int, updateIDs models.BulkUpdateIds) []int {
	// if we are setting the ids, just return the ids
	if updateIDs.Mode == models.BulkUpdateIDModeSet {
		existingIDs = []int{}
		for _, idStr := range updateIDs.Ids {
			id, _ := strconv.Atoi(idStr)
			existingIDs = append(existingIDs, id)
		}

		return existingIDs
	}

	for _, idStr := range updateIDs.Ids {
		id, _ := strconv.Atoi(idStr)

		// look for the id in the list
		foundExisting := false
		for idx, existingID := range existingIDs {
			if existingID == id {
				if updateIDs.Mode == models.BulkUpdateIDModeRemove {
					// remove from the list
					existingIDs = append(existingIDs[:idx], existingIDs[idx+1:]...)
				}

				foundExisting = true
				break
			}
		}

		if !foundExisting && updateIDs.Mode != models.BulkUpdateIDModeRemove {
			existingIDs = append(existingIDs, id)
		}
	}

	return existingIDs
}

func adjustScenePerformerIDs(qb models.SceneReader, sceneID int, ids models.BulkUpdateIds) (ret []int, err error) {
	ret, err = qb.GetPerformerIDs(sceneID)
	if err != nil {
		return nil, err
	}

	return adjustIDs(ret, ids), nil
}

func adjustSceneTagIDs(qb models.SceneReader, sceneID int, ids models.BulkUpdateIds) (ret []int, err error) {
	ret, err = qb.GetTagIDs(sceneID)
	if err != nil {
		return nil, err
	}

	return adjustIDs(ret, ids), nil
}

func (r *mutationResolver) SceneDestroy(ctx context.Context, input models.SceneDestroyInput) (bool, error) {
	sceneID, err := strconv.Atoi(input.ID)
	if err != nil {
		return false, err
	}

	var scene *models.Scene
	var postCommitFunc func()
	if err := r.withTxn(ctx, func(repo models.Repository) error {
		qb := repo.Scene()
		var err error
		scene, err = qb.Find(sceneID)
		if err != nil {
			return err
		}

		if scene == nil {
			return fmt.Errorf("scene with id %d not found", sceneID)
		}

		postCommitFunc, err = manager.DestroyScene(scene, repo)
		return err
	}); err != nil {
		return false, err
	}

	// perform the post-commit actions
	postCommitFunc()

	// if delete generated is true, then delete the generated files
	// for the scene
	if input.DeleteGenerated != nil && *input.DeleteGenerated {
		manager.DeleteGeneratedSceneFiles(scene, config.GetVideoFileNamingAlgorithm())
	}

	// if delete file is true, then delete the file as well
	// if it fails, just log a message
	if input.DeleteFile != nil && *input.DeleteFile {
		manager.DeleteSceneFile(scene)
	}

	return true, nil
}

func (r *mutationResolver) ScenesDestroy(ctx context.Context, input models.ScenesDestroyInput) (bool, error) {
	var scenes []*models.Scene
	var postCommitFuncs []func()
	if err := r.withTxn(ctx, func(repo models.Repository) error {
		qb := repo.Scene()

		for _, id := range input.Ids {
			sceneID, _ := strconv.Atoi(id)

			scene, err := qb.Find(sceneID)
			if scene != nil {
				scenes = append(scenes, scene)
			}
			f, err := manager.DestroyScene(scene, repo)
			if err != nil {
				return err
			}

			postCommitFuncs = append(postCommitFuncs, f)
		}

		return nil
	}); err != nil {
		return false, err
	}

	for _, f := range postCommitFuncs {
		f()
	}

	fileNamingAlgo := config.GetVideoFileNamingAlgorithm()
	for _, scene := range scenes {
		// if delete generated is true, then delete the generated files
		// for the scene
		if input.DeleteGenerated != nil && *input.DeleteGenerated {
			manager.DeleteGeneratedSceneFiles(scene, fileNamingAlgo)
		}

		// if delete file is true, then delete the file as well
		// if it fails, just log a message
		if input.DeleteFile != nil && *input.DeleteFile {
			manager.DeleteSceneFile(scene)
		}
	}

	return true, nil
}

func (r *mutationResolver) SceneMarkerCreate(ctx context.Context, input models.SceneMarkerCreateInput) (*models.SceneMarker, error) {
	primaryTagID, _ := strconv.Atoi(input.PrimaryTagID)
	sceneID, _ := strconv.Atoi(input.SceneID)
	currentTime := time.Now()
	newSceneMarker := models.SceneMarker{
		Title:        input.Title,
		Seconds:      input.Seconds,
		PrimaryTagID: primaryTagID,
		SceneID:      sql.NullInt64{Int64: int64(sceneID), Valid: sceneID != 0},
		CreatedAt:    models.SQLiteTimestamp{Timestamp: currentTime},
		UpdatedAt:    models.SQLiteTimestamp{Timestamp: currentTime},
	}

	return changeMarker(ctx, create, newSceneMarker, input.TagIds)
}

func (r *mutationResolver) SceneMarkerUpdate(ctx context.Context, input models.SceneMarkerUpdateInput) (*models.SceneMarker, error) {
	// Populate scene marker from the input
	sceneMarkerID, _ := strconv.Atoi(input.ID)
	sceneID, _ := strconv.Atoi(input.SceneID)
	primaryTagID, _ := strconv.Atoi(input.PrimaryTagID)
	updatedSceneMarker := models.SceneMarker{
		ID:           sceneMarkerID,
		Title:        input.Title,
		Seconds:      input.Seconds,
		SceneID:      sql.NullInt64{Int64: int64(sceneID), Valid: sceneID != 0},
		PrimaryTagID: primaryTagID,
		UpdatedAt:    models.SQLiteTimestamp{Timestamp: time.Now()},
	}

	return changeMarker(ctx, update, updatedSceneMarker, input.TagIds)
}

func (r *mutationResolver) SceneMarkerDestroy(ctx context.Context, id string) (bool, error) {
	qb := sqlite.NewSceneMarkerQueryBuilder()
	tx := database.DB.MustBeginTx(ctx, nil)

	markerID, _ := strconv.Atoi(id)
	marker, err := qb.Find(markerID)

	if err != nil {
		return false, err
	}

	if err := qb.Destroy(markerID, tx); err != nil {
		_ = tx.Rollback()
		return false, err
	}
	if err := tx.Commit(); err != nil {
		return false, err
	}

	// delete the preview for the marker
	sqb := sqlite.NewSceneQueryBuilder()
	scene, _ := sqb.Find(int(marker.SceneID.Int64))

	if scene != nil {
		seconds := int(marker.Seconds)
		manager.DeleteSceneMarkerFiles(scene, seconds, config.GetVideoFileNamingAlgorithm())
	}

	return true, nil
}

func changeMarker(ctx context.Context, changeType int, changedMarker models.SceneMarker, tagIds []string) (*models.SceneMarker, error) {
	// Start the transaction and save the scene marker
	tx := database.DB.MustBeginTx(ctx, nil)
	qb := sqlite.NewSceneMarkerQueryBuilder()
	jqb := sqlite.NewJoinsQueryBuilder()

	var existingMarker *models.SceneMarker
	var sceneMarker *models.SceneMarker
	var err error
	switch changeType {
	case create:
		sceneMarker, err = qb.Create(changedMarker, tx)
	case update:
		// check to see if timestamp was changed
		existingMarker, err = qb.Find(changedMarker.ID)
		if err == nil {
			sceneMarker, err = qb.Update(changedMarker, tx)
		}
	}
	if err != nil {
		_ = tx.Rollback()
		return nil, err
	}

	// Save the marker tags
	var markerTagJoins []models.SceneMarkersTags
	for _, tid := range tagIds {
		tagID, _ := strconv.Atoi(tid)
		if tagID == changedMarker.PrimaryTagID {
			continue // If this tag is the primary tag, then let's not add it.
		}
		markerTag := models.SceneMarkersTags{
			SceneMarkerID: sceneMarker.ID,
			TagID:         tagID,
		}
		markerTagJoins = append(markerTagJoins, markerTag)
	}
	switch changeType {
	case create:
		if err := jqb.CreateSceneMarkersTags(markerTagJoins, tx); err != nil {
			_ = tx.Rollback()
			return nil, err
		}
	case update:
		if err := jqb.UpdateSceneMarkersTags(changedMarker.ID, markerTagJoins, tx); err != nil {
			_ = tx.Rollback()
			return nil, err
		}
	}

	// Commit
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	// remove the marker preview if the timestamp was changed
	if existingMarker != nil && existingMarker.Seconds != changedMarker.Seconds {
		sqb := sqlite.NewSceneQueryBuilder()

		scene, _ := sqb.Find(int(existingMarker.SceneID.Int64))

		if scene != nil {
			seconds := int(existingMarker.Seconds)
			manager.DeleteSceneMarkerFiles(scene, seconds, config.GetVideoFileNamingAlgorithm())
		}
	}

	return sceneMarker, nil
}

func (r *mutationResolver) SceneIncrementO(ctx context.Context, id string) (int, error) {
	sceneID, _ := strconv.Atoi(id)

	tx := database.DB.MustBeginTx(ctx, nil)
	qb := sqlite.NewSceneQueryBuilder()

	newVal, err := qb.IncrementOCounter(sceneID, tx)
	if err != nil {
		_ = tx.Rollback()
		return 0, err
	}

	// Commit
	if err := tx.Commit(); err != nil {
		return 0, err
	}

	return newVal, nil
}

func (r *mutationResolver) SceneDecrementO(ctx context.Context, id string) (int, error) {
	sceneID, _ := strconv.Atoi(id)

	tx := database.DB.MustBeginTx(ctx, nil)
	qb := sqlite.NewSceneQueryBuilder()

	newVal, err := qb.DecrementOCounter(sceneID, tx)
	if err != nil {
		_ = tx.Rollback()
		return 0, err
	}

	// Commit
	if err := tx.Commit(); err != nil {
		return 0, err
	}

	return newVal, nil
}

func (r *mutationResolver) SceneResetO(ctx context.Context, id string) (int, error) {
	sceneID, _ := strconv.Atoi(id)

	tx := database.DB.MustBeginTx(ctx, nil)
	qb := sqlite.NewSceneQueryBuilder()

	newVal, err := qb.ResetOCounter(sceneID, tx)
	if err != nil {
		_ = tx.Rollback()
		return 0, err
	}

	// Commit
	if err := tx.Commit(); err != nil {
		return 0, err
	}

	return newVal, nil
}

func (r *mutationResolver) SceneGenerateScreenshot(ctx context.Context, id string, at *float64) (string, error) {
	if at != nil {
		manager.GetInstance().GenerateScreenshot(id, *at)
	} else {
		manager.GetInstance().GenerateDefaultScreenshot(id)
	}

	return "todo", nil
}
