package autotag

import (
	"testing"

	"github.com/stashapp/stash/pkg/models"
	"github.com/stashapp/stash/pkg/models/mocks"
	"github.com/stretchr/testify/assert"
)

func TestTagScenes(t *testing.T) {
	type test struct {
		tagName       string
		expectedRegex string
	}

	tagNames := []test{
		{
			"tag name",
			`(?i)(?:^|_|[^\w\d])tag[.\-_ ]*name(?:$|_|[^\w\d])`,
		},
		{
			"tag + name",
			`(?i)(?:^|_|[^\w\d])tag[.\-_ ]*\+[.\-_ ]*name(?:$|_|[^\w\d])`,
		},
	}

	for _, p := range tagNames {
		testTagScenes(t, p.tagName, p.expectedRegex)
	}
}

func testTagScenes(t *testing.T, tagName, expectedRegex string) {
	mockSceneReader := &mocks.SceneReaderWriter{}

	const tagID = 2

	var scenes []*models.Scene
	matchingPaths, falsePaths := generateTestPaths(tagName, "mp4")
	for i, p := range append(matchingPaths, falsePaths...) {
		scenes = append(scenes, &models.Scene{
			ID:   i + 1,
			Path: p,
		})
	}

	tag := models.Tag{
		ID:   tagID,
		Name: tagName,
	}

	organized := false
	perPage := models.PerPageAll

	expectedSceneFilter := &models.SceneFilterType{
		Organized: &organized,
		Path: &models.StringCriterionInput{
			Value:    expectedRegex,
			Modifier: models.CriterionModifierMatchesRegex,
		},
	}

	expectedFindFilter := &models.FindFilterType{
		PerPage: &perPage,
	}

	mockSceneReader.On("Query", expectedSceneFilter, expectedFindFilter).Return(scenes, len(scenes), nil).Once()

	for i := range matchingPaths {
		sceneID := i + 1
		mockSceneReader.On("GetTagIDs", sceneID).Return(nil, nil).Once()
		mockSceneReader.On("UpdateTags", sceneID, []int{tagID}).Return(nil).Once()
	}

	err := TagScenes(&tag, nil, mockSceneReader)

	assert := assert.New(t)

	assert.Nil(err)
	mockSceneReader.AssertExpectations(t)
}

func TestTagImages(t *testing.T) {
	type test struct {
		tagName       string
		expectedRegex string
	}

	tagNames := []test{
		{
			"tag name",
			`(?i)(?:^|_|[^\w\d])tag[.\-_ ]*name(?:$|_|[^\w\d])`,
		},
		{
			"tag + name",
			`(?i)(?:^|_|[^\w\d])tag[.\-_ ]*\+[.\-_ ]*name(?:$|_|[^\w\d])`,
		},
	}

	for _, p := range tagNames {
		testTagImages(t, p.tagName, p.expectedRegex)
	}
}

func testTagImages(t *testing.T, tagName, expectedRegex string) {
	mockImageReader := &mocks.ImageReaderWriter{}

	const tagID = 2

	var images []*models.Image
	matchingPaths, falsePaths := generateTestPaths(tagName, "mp4")
	for i, p := range append(matchingPaths, falsePaths...) {
		images = append(images, &models.Image{
			ID:   i + 1,
			Path: p,
		})
	}

	tag := models.Tag{
		ID:   tagID,
		Name: tagName,
	}

	organized := false
	perPage := models.PerPageAll

	expectedImageFilter := &models.ImageFilterType{
		Organized: &organized,
		Path: &models.StringCriterionInput{
			Value:    expectedRegex,
			Modifier: models.CriterionModifierMatchesRegex,
		},
	}

	expectedFindFilter := &models.FindFilterType{
		PerPage: &perPage,
	}

	mockImageReader.On("Query", expectedImageFilter, expectedFindFilter).Return(images, len(images), nil).Once()

	for i := range matchingPaths {
		imageID := i + 1
		mockImageReader.On("GetTagIDs", imageID).Return(nil, nil).Once()
		mockImageReader.On("UpdateTags", imageID, []int{tagID}).Return(nil).Once()
	}

	err := TagImages(&tag, nil, mockImageReader)

	assert := assert.New(t)

	assert.Nil(err)
	mockImageReader.AssertExpectations(t)
}

func TestTagGalleries(t *testing.T) {
	type test struct {
		tagName       string
		expectedRegex string
	}

	tagNames := []test{
		{
			"tag name",
			`(?i)(?:^|_|[^\w\d])tag[.\-_ ]*name(?:$|_|[^\w\d])`,
		},
		{
			"tag + name",
			`(?i)(?:^|_|[^\w\d])tag[.\-_ ]*\+[.\-_ ]*name(?:$|_|[^\w\d])`,
		},
	}

	for _, p := range tagNames {
		testTagGalleries(t, p.tagName, p.expectedRegex)
	}
}

func testTagGalleries(t *testing.T, tagName, expectedRegex string) {
	mockGalleryReader := &mocks.GalleryReaderWriter{}

	const tagID = 2

	var galleries []*models.Gallery
	matchingPaths, falsePaths := generateTestPaths(tagName, "mp4")
	for i, p := range append(matchingPaths, falsePaths...) {
		galleries = append(galleries, &models.Gallery{
			ID:   i + 1,
			Path: models.NullString(p),
		})
	}

	tag := models.Tag{
		ID:   tagID,
		Name: tagName,
	}

	organized := false
	perPage := models.PerPageAll

	expectedGalleryFilter := &models.GalleryFilterType{
		Organized: &organized,
		Path: &models.StringCriterionInput{
			Value:    expectedRegex,
			Modifier: models.CriterionModifierMatchesRegex,
		},
	}

	expectedFindFilter := &models.FindFilterType{
		PerPage: &perPage,
	}

	mockGalleryReader.On("Query", expectedGalleryFilter, expectedFindFilter).Return(galleries, len(galleries), nil).Once()

	for i := range matchingPaths {
		galleryID := i + 1
		mockGalleryReader.On("GetTagIDs", galleryID).Return(nil, nil).Once()
		mockGalleryReader.On("UpdateTags", galleryID, []int{tagID}).Return(nil).Once()
	}

	err := TagGalleries(&tag, nil, mockGalleryReader)

	assert := assert.New(t)

	assert.Nil(err)
	mockGalleryReader.AssertExpectations(t)
}
