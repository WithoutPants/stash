// +build integration

package sqlite_test

import (
	"strconv"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/stashapp/stash/pkg/models"
)

func TestGalleryFind(t *testing.T) {
	withTxn(func(r models.Repository) error {
		gqb := r.Gallery()

		const galleryIdx = 0
		gallery, err := gqb.Find(galleryIDs[galleryIdx])

		if err != nil {
			t.Errorf("Error finding gallery: %s", err.Error())
		}

		assert.Equal(t, getGalleryStringValue(galleryIdx, "Path"), gallery.Path.String)

		gallery, err = gqb.Find(0)

		if err != nil {
			t.Errorf("Error finding gallery: %s", err.Error())
		}

		assert.Nil(t, gallery)

		return nil
	})
}

func TestGalleryFindByChecksum(t *testing.T) {
	withTxn(func(r models.Repository) error {
		gqb := r.Gallery()

		const galleryIdx = 0
		galleryChecksum := getGalleryStringValue(galleryIdx, "Checksum")
		gallery, err := gqb.FindByChecksum(galleryChecksum)

		if err != nil {
			t.Errorf("Error finding gallery: %s", err.Error())
		}

		assert.Equal(t, getGalleryStringValue(galleryIdx, "Path"), gallery.Path.String)

		galleryChecksum = "not exist"
		gallery, err = gqb.FindByChecksum(galleryChecksum)

		if err != nil {
			t.Errorf("Error finding gallery: %s", err.Error())
		}

		assert.Nil(t, gallery)

		return nil
	})
}

func TestGalleryFindByPath(t *testing.T) {
	withTxn(func(r models.Repository) error {
		gqb := r.Gallery()

		const galleryIdx = 0
		galleryPath := getGalleryStringValue(galleryIdx, "Path")
		gallery, err := gqb.FindByPath(galleryPath)

		if err != nil {
			t.Errorf("Error finding gallery: %s", err.Error())
		}

		assert.Equal(t, galleryPath, gallery.Path.String)

		galleryPath = "not exist"
		gallery, err = gqb.FindByPath(galleryPath)

		if err != nil {
			t.Errorf("Error finding gallery: %s", err.Error())
		}

		assert.Nil(t, gallery)

		return nil
	})
}

func TestGalleryFindBySceneID(t *testing.T) {
	withTxn(func(r models.Repository) error {
		gqb := r.Gallery()

		sceneID := sceneIDs[sceneIdxWithGallery]
		galleries, err := gqb.FindBySceneID(sceneID)

		if err != nil {
			t.Errorf("Error finding gallery: %s", err.Error())
		}

		assert.Equal(t, getGalleryStringValue(galleryIdxWithScene, "Path"), galleries[0].Path.String)

		galleries, err = gqb.FindBySceneID(0)

		if err != nil {
			t.Errorf("Error finding gallery: %s", err.Error())
		}

		assert.Nil(t, galleries)

		return nil
	})
}

func TestGalleryQueryQ(t *testing.T) {
	withTxn(func(r models.Repository) error {
		const galleryIdx = 0

		q := getGalleryStringValue(galleryIdx, pathField)

		sqb := r.Gallery()

		galleryQueryQ(t, sqb, q, galleryIdx)

		return nil
	})
}

func galleryQueryQ(t *testing.T, qb models.GalleryReader, q string, expectedGalleryIdx int) {
	filter := models.FindFilterType{
		Q: &q,
	}
	galleries, _, err := qb.Query(nil, &filter)
	if err != nil {
		t.Errorf("Error querying gallery: %s", err.Error())
	}

	assert.Len(t, galleries, 1)
	gallery := galleries[0]
	assert.Equal(t, galleryIDs[expectedGalleryIdx], gallery.ID)

	// no Q should return all results
	filter.Q = nil
	galleries, _, err = qb.Query(nil, &filter)
	if err != nil {
		t.Errorf("Error querying gallery: %s", err.Error())
	}

	assert.Len(t, galleries, totalGalleries)
}

func TestGalleryQueryPath(t *testing.T) {
	withTxn(func(r models.Repository) error {
		const galleryIdx = 1
		galleryPath := getGalleryStringValue(galleryIdx, "Path")

		pathCriterion := models.StringCriterionInput{
			Value:    galleryPath,
			Modifier: models.CriterionModifierEquals,
		}

		verifyGalleriesPath(t, r.Gallery(), pathCriterion)

		pathCriterion.Modifier = models.CriterionModifierNotEquals
		verifyGalleriesPath(t, r.Gallery(), pathCriterion)

		pathCriterion.Modifier = models.CriterionModifierMatchesRegex
		pathCriterion.Value = "gallery.*1_Path"
		verifyGalleriesPath(t, r.Gallery(), pathCriterion)

		pathCriterion.Modifier = models.CriterionModifierNotMatchesRegex
		verifyGalleriesPath(t, r.Gallery(), pathCriterion)

		return nil
	})
}

func verifyGalleriesPath(t *testing.T, sqb models.GalleryReader, pathCriterion models.StringCriterionInput) {
	galleryFilter := models.GalleryFilterType{
		Path: &pathCriterion,
	}

	galleries, _, err := sqb.Query(&galleryFilter, nil)
	if err != nil {
		t.Errorf("Error querying gallery: %s", err.Error())
	}

	for _, gallery := range galleries {
		verifyNullString(t, gallery.Path, pathCriterion)
	}
}

func TestGalleryQueryRating(t *testing.T) {
	const rating = 3
	ratingCriterion := models.IntCriterionInput{
		Value:    rating,
		Modifier: models.CriterionModifierEquals,
	}

	verifyGalleriesRating(t, ratingCriterion)

	ratingCriterion.Modifier = models.CriterionModifierNotEquals
	verifyGalleriesRating(t, ratingCriterion)

	ratingCriterion.Modifier = models.CriterionModifierGreaterThan
	verifyGalleriesRating(t, ratingCriterion)

	ratingCriterion.Modifier = models.CriterionModifierLessThan
	verifyGalleriesRating(t, ratingCriterion)

	ratingCriterion.Modifier = models.CriterionModifierIsNull
	verifyGalleriesRating(t, ratingCriterion)

	ratingCriterion.Modifier = models.CriterionModifierNotNull
	verifyGalleriesRating(t, ratingCriterion)
}

func verifyGalleriesRating(t *testing.T, ratingCriterion models.IntCriterionInput) {
	withTxn(func(r models.Repository) error {
		sqb := r.Gallery()
		galleryFilter := models.GalleryFilterType{
			Rating: &ratingCriterion,
		}

		galleries, _, err := sqb.Query(&galleryFilter, nil)
		if err != nil {
			t.Errorf("Error querying gallery: %s", err.Error())
		}

		for _, gallery := range galleries {
			verifyInt64(t, gallery.Rating, ratingCriterion)
		}

		return nil
	})
}

func TestGalleryQueryIsMissingScene(t *testing.T) {
	withTxn(func(r models.Repository) error {
		qb := r.Gallery()
		isMissing := "scenes"
		galleryFilter := models.GalleryFilterType{
			IsMissing: &isMissing,
		}

		q := getGalleryStringValue(galleryIdxWithScene, titleField)
		findFilter := models.FindFilterType{
			Q: &q,
		}

		galleries, _, err := qb.Query(&galleryFilter, &findFilter)
		if err != nil {
			t.Errorf("Error querying gallery: %s", err.Error())
		}

		assert.Len(t, galleries, 0)

		findFilter.Q = nil
		galleries, _, err = qb.Query(&galleryFilter, &findFilter)
		if err != nil {
			t.Errorf("Error querying gallery: %s", err.Error())
		}

		// ensure non of the ids equal the one with gallery
		for _, gallery := range galleries {
			assert.NotEqual(t, galleryIDs[galleryIdxWithScene], gallery.ID)
		}

		return nil
	})
}

func queryGalleries(t *testing.T, sqb models.GalleryReader, galleryFilter *models.GalleryFilterType, findFilter *models.FindFilterType) []*models.Gallery {
	galleries, _, err := sqb.Query(galleryFilter, findFilter)
	if err != nil {
		t.Errorf("Error querying galleries: %s", err.Error())
	}

	return galleries
}

func TestGalleryQueryPerformerTags(t *testing.T) {
	withTxn(func(r models.Repository) error {
		sqb := r.Gallery()
		tagCriterion := models.MultiCriterionInput{
			Value: []string{
				strconv.Itoa(tagIDs[tagIdxWithPerformer]),
				strconv.Itoa(tagIDs[tagIdx1WithPerformer]),
			},
			Modifier: models.CriterionModifierIncludes,
		}

		galleryFilter := models.GalleryFilterType{
			PerformerTags: &tagCriterion,
		}

		galleries := queryGalleries(t, sqb, &galleryFilter, nil)
		assert.Len(t, galleries, 2)

		// ensure ids are correct
		for _, gallery := range galleries {
			assert.True(t, gallery.ID == galleryIDs[galleryIdxWithPerformerTag] || gallery.ID == galleryIDs[galleryIdxWithPerformerTwoTags])
		}

		tagCriterion = models.MultiCriterionInput{
			Value: []string{
				strconv.Itoa(tagIDs[tagIdx1WithPerformer]),
				strconv.Itoa(tagIDs[tagIdx2WithPerformer]),
			},
			Modifier: models.CriterionModifierIncludesAll,
		}

		galleries = queryGalleries(t, sqb, &galleryFilter, nil)

		assert.Len(t, galleries, 1)
		assert.Equal(t, galleryIDs[galleryIdxWithPerformerTwoTags], galleries[0].ID)

		tagCriterion = models.MultiCriterionInput{
			Value: []string{
				strconv.Itoa(tagIDs[tagIdx1WithPerformer]),
			},
			Modifier: models.CriterionModifierExcludes,
		}

		q := getGalleryStringValue(galleryIdxWithPerformerTwoTags, titleField)
		findFilter := models.FindFilterType{
			Q: &q,
		}

		galleries = queryGalleries(t, sqb, &galleryFilter, &findFilter)
		assert.Len(t, galleries, 0)

		return nil
	})
}

// TODO Count
// TODO All
// TODO Query
// TODO Update
// TODO Destroy
