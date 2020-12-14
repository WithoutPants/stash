package api

import (
	"context"
	"database/sql"
	"strconv"
	"time"

	"github.com/jmoiron/sqlx"

	"github.com/stashapp/stash/pkg/database"
	"github.com/stashapp/stash/pkg/manager"
	"github.com/stashapp/stash/pkg/manager/config"
	"github.com/stashapp/stash/pkg/models"
	"github.com/stashapp/stash/pkg/sqlite"
	"github.com/stashapp/stash/pkg/utils"
)

func (r *mutationResolver) SceneUpdate(ctx context.Context, input models.SceneUpdateInput) (*models.Scene, error) {
	// Start the transaction and save the scene
	tx := database.DB.MustBeginTx(ctx, nil)

	translator := changesetTranslator{
		inputMap: getUpdateInputMap(ctx),
	}
	ret, err := r.sceneUpdate(input, translator, tx)

	if err != nil {
		_ = tx.Rollback()
		return nil, err
	}

	// Commit
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return ret, nil
}

func (r *mutationResolver) ScenesUpdate(ctx context.Context, input []*models.SceneUpdateInput) ([]*models.Scene, error) {
	// Start the transaction and save the scene
	tx := database.DB.MustBeginTx(ctx, nil)

	var ret []*models.Scene

	inputMaps := getUpdateInputMaps(ctx)

	for i, scene := range input {
		translator := changesetTranslator{
			inputMap: inputMaps[i],
		}

		thisScene, err := r.sceneUpdate(*scene, translator, tx)
		ret = append(ret, thisScene)

		if err != nil {
			_ = tx.Rollback()
			return nil, err
		}
	}

	// Commit
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return ret, nil
}

func (r *mutationResolver) sceneUpdate(input models.SceneUpdateInput, translator changesetTranslator, tx *sqlx.Tx) (*models.Scene, error) {
	// Populate scene from the input
	sceneID, _ := strconv.Atoi(input.ID)

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

	qb := sqlite.NewSceneQueryBuilder()
	jqb := sqlite.NewJoinsQueryBuilder()
	scene, err := qb.Update(updatedScene, tx)
	if err != nil {
		return nil, err
	}

	// update cover table
	if len(coverImageData) > 0 {
		if err := qb.UpdateSceneCover(sceneID, coverImageData, tx); err != nil {
			return nil, err
		}
	}

	// Clear the existing gallery value
	if translator.hasField("gallery_id") {
		gqb := sqlite.NewGalleryQueryBuilder()
		err = gqb.ClearGalleryId(sceneID, tx)
		if err != nil {
			return nil, err
		}

		if input.GalleryID != nil {
			// Save the gallery
			galleryID, _ := strconv.Atoi(*input.GalleryID)
			updatedGallery := models.Gallery{
				ID:        galleryID,
				SceneID:   sql.NullInt64{Int64: int64(sceneID), Valid: true},
				UpdatedAt: models.SQLiteTimestamp{Timestamp: updatedTime},
			}
			gqb := sqlite.NewGalleryQueryBuilder()
			_, err := gqb.Update(updatedGallery, tx)
			if err != nil {
				return nil, err
			}
		}
	}

	// Save the performers
	if translator.hasField("performer_ids") {
		var performerJoins []models.PerformersScenes
		for _, pid := range input.PerformerIds {
			performerID, _ := strconv.Atoi(pid)
			performerJoin := models.PerformersScenes{
				PerformerID: performerID,
				SceneID:     sceneID,
			}
			performerJoins = append(performerJoins, performerJoin)
		}
		if err := jqb.UpdatePerformersScenes(sceneID, performerJoins, tx); err != nil {
			return nil, err
		}
	}

	// Save the movies
	if translator.hasField("movies") {
		var movieJoins []models.MoviesScenes

		for _, movie := range input.Movies {

			movieID, _ := strconv.Atoi(movie.MovieID)

			movieJoin := models.MoviesScenes{
				MovieID: movieID,
				SceneID: sceneID,
			}

			if movie.SceneIndex != nil {
				movieJoin.SceneIndex = sql.NullInt64{
					Int64: int64(*movie.SceneIndex),
					Valid: true,
				}
			}

			movieJoins = append(movieJoins, movieJoin)
		}
		if err := jqb.UpdateMoviesScenes(sceneID, movieJoins, tx); err != nil {
			return nil, err
		}
	}

	// Save the tags
	if translator.hasField("tag_ids") {
		var tagJoins []models.ScenesTags
		for _, tid := range input.TagIds {
			tagID, _ := strconv.Atoi(tid)
			tagJoin := models.ScenesTags{
				SceneID: sceneID,
				TagID:   tagID,
			}
			tagJoins = append(tagJoins, tagJoin)
		}
		if err := jqb.UpdateScenesTags(sceneID, tagJoins, tx); err != nil {
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

	// Save the stash_ids
	if translator.hasField("stash_ids") {
		var stashIDJoins []models.StashID
		for _, stashID := range input.StashIds {
			newJoin := models.StashID{
				StashID:  stashID.StashID,
				Endpoint: stashID.Endpoint,
			}
			stashIDJoins = append(stashIDJoins, newJoin)
		}
		if err := jqb.UpdateSceneStashIDs(sceneID, stashIDJoins, tx); err != nil {
			return nil, err
		}
	}

	return scene, nil
}

func (r *mutationResolver) BulkSceneUpdate(ctx context.Context, input models.BulkSceneUpdateInput) ([]*models.Scene, error) {
	// Populate scene from the input
	updatedTime := time.Now()

	translator := changesetTranslator{
		inputMap: getUpdateInputMap(ctx),
	}

	// Start the transaction and save the scene marker
	tx := database.DB.MustBeginTx(ctx, nil)
	qb := sqlite.NewSceneQueryBuilder()
	jqb := sqlite.NewJoinsQueryBuilder()

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

	for _, sceneIDStr := range input.Ids {
		sceneID, _ := strconv.Atoi(sceneIDStr)
		updatedScene.ID = sceneID

		scene, err := qb.Update(updatedScene, tx)
		if err != nil {
			_ = tx.Rollback()
			return nil, err
		}

		ret = append(ret, scene)

		if translator.hasField("gallery_id") {
			// Save the gallery
			var galleryID int
			if input.GalleryID != nil {
				galleryID, _ = strconv.Atoi(*input.GalleryID)
			}
			updatedGallery := models.Gallery{
				ID:        galleryID,
				SceneID:   sql.NullInt64{Int64: int64(sceneID), Valid: true},
				UpdatedAt: models.SQLiteTimestamp{Timestamp: updatedTime},
			}
			gqb := sqlite.NewGalleryQueryBuilder()
			_, err := gqb.Update(updatedGallery, tx)
			if err != nil {
				_ = tx.Rollback()
				return nil, err
			}
		}

		// Save the performers
		if translator.hasField("performer_ids") {
			performerIDs, err := adjustScenePerformerIDs(tx, sceneID, *input.PerformerIds)
			if err != nil {
				_ = tx.Rollback()
				return nil, err
			}

			var performerJoins []models.PerformersScenes
			for _, performerID := range performerIDs {
				performerJoin := models.PerformersScenes{
					PerformerID: performerID,
					SceneID:     sceneID,
				}
				performerJoins = append(performerJoins, performerJoin)
			}
			if err := jqb.UpdatePerformersScenes(sceneID, performerJoins, tx); err != nil {
				_ = tx.Rollback()
				return nil, err
			}
		}

		// Save the tags
		if translator.hasField("tag_ids") {
			tagIDs, err := adjustSceneTagIDs(tx, sceneID, *input.TagIds)
			if err != nil {
				_ = tx.Rollback()
				return nil, err
			}

			var tagJoins []models.ScenesTags
			for _, tagID := range tagIDs {
				tagJoin := models.ScenesTags{
					SceneID: sceneID,
					TagID:   tagID,
				}
				tagJoins = append(tagJoins, tagJoin)
			}
			if err := jqb.UpdateScenesTags(sceneID, tagJoins, tx); err != nil {
				_ = tx.Rollback()
				return nil, err
			}
		}
	}

	// Commit
	if err := tx.Commit(); err != nil {
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

func adjustScenePerformerIDs(tx *sqlx.Tx, sceneID int, ids models.BulkUpdateIds) ([]int, error) {
	var ret []int

	jqb := sqlite.NewJoinsQueryBuilder()
	if ids.Mode == models.BulkUpdateIDModeAdd || ids.Mode == models.BulkUpdateIDModeRemove {
		// adding to the joins
		performerJoins, err := jqb.GetScenePerformers(sceneID, tx)

		if err != nil {
			return nil, err
		}

		for _, join := range performerJoins {
			ret = append(ret, join.PerformerID)
		}
	}

	return adjustIDs(ret, ids), nil
}

func adjustSceneTagIDs(tx *sqlx.Tx, sceneID int, ids models.BulkUpdateIds) ([]int, error) {
	var ret []int

	jqb := sqlite.NewJoinsQueryBuilder()
	if ids.Mode == models.BulkUpdateIDModeAdd || ids.Mode == models.BulkUpdateIDModeRemove {
		// adding to the joins
		tagJoins, err := jqb.GetSceneTags(sceneID, tx)

		if err != nil {
			return nil, err
		}

		for _, join := range tagJoins {
			ret = append(ret, join.TagID)
		}
	}

	return adjustIDs(ret, ids), nil
}

func (r *mutationResolver) SceneDestroy(ctx context.Context, input models.SceneDestroyInput) (bool, error) {
	qb := sqlite.NewSceneQueryBuilder()
	tx := database.DB.MustBeginTx(ctx, nil)

	sceneID, _ := strconv.Atoi(input.ID)
	scene, err := qb.Find(sceneID)
	err = manager.DestroyScene(sceneID, tx)

	if err != nil {
		tx.Rollback()
		return false, err
	}

	if err := tx.Commit(); err != nil {
		return false, err
	}

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
	qb := sqlite.NewSceneQueryBuilder()
	tx := database.DB.MustBeginTx(ctx, nil)

	var scenes []*models.Scene
	for _, id := range input.Ids {
		sceneID, _ := strconv.Atoi(id)

		scene, err := qb.Find(sceneID)
		if scene != nil {
			scenes = append(scenes, scene)
		}
		err = manager.DestroyScene(sceneID, tx)

		if err != nil {
			tx.Rollback()
			return false, err
		}
	}

	if err := tx.Commit(); err != nil {
		return false, err
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
