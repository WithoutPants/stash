package gallery

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stashapp/stash/pkg/models"
	"github.com/stashapp/stash/pkg/models/json"
	"github.com/stashapp/stash/pkg/models/jsonschema"
	"github.com/stashapp/stash/pkg/models/mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

const (
	galleryNameErr = "galleryNameErr"
	// existingGalleryName = "existingGalleryName"

	existingGalleryID   = 100
	existingStudioID    = 101
	existingPerformerID = 103
	existingTagID       = 105

	existingStudioName = "existingStudioName"
	existingStudioErr  = "existingStudioErr"
	missingStudioName  = "missingStudioName"

	existingPerformerName = "existingPerformerName"
	existingPerformerErr  = "existingPerformerErr"
	missingPerformerName  = "missingPerformerName"

	existingTagName = "existingTagName"
	existingTagErr  = "existingTagErr"
	missingTagName  = "missingTagName"

	errPerformersID = 200

	missingChecksum = "missingChecksum"
	errChecksum     = "errChecksum"
)

var testCtx = context.Background()

var (
	createdAt = time.Date(2001, time.January, 2, 1, 2, 3, 4, time.Local)
	updatedAt = time.Date(2002, time.January, 2, 1, 2, 3, 4, time.Local)
)

func TestImporterName(t *testing.T) {
	i := Importer{
		Input: jsonschema.Gallery{
			Path: path,
		},
	}

	assert.Equal(t, path, i.Name())
}

func TestImporterPreImport(t *testing.T) {
	i := Importer{
		Input: jsonschema.Gallery{
			Path:      path,
			Checksum:  checksum,
			Title:     title,
			Date:      date,
			Details:   details,
			Rating:    rating,
			Organized: organized,
			URL:       url,
			CreatedAt: json.JSONTime{
				Time: createdAt,
			},
			UpdatedAt: json.JSONTime{
				Time: updatedAt,
			},
		},
	}

	err := i.PreImport(testCtx)
	assert.Nil(t, err)

	expectedGallery := models.Gallery{
		Path:     models.NullString(path),
		Checksum: checksum,
		Title:    models.NullString(title),
		Date: models.SQLiteDate{
			String: date,
			Valid:  true,
		},
		Details:   models.NullString(details),
		Rating:    models.NullInt64(rating),
		Organized: organized,
		URL:       models.NullString(url),
		CreatedAt: models.SQLiteTimestamp{
			Timestamp: createdAt,
		},
		UpdatedAt: models.SQLiteTimestamp{
			Timestamp: updatedAt,
		},
	}

	assert.Equal(t, expectedGallery, i.gallery)
}

func TestImporterPreImportWithStudio(t *testing.T) {
	studioReaderWriter := &mocks.StudioReaderWriter{}

	i := Importer{
		StudioWriter: studioReaderWriter,
		Input: jsonschema.Gallery{
			Studio: existingStudioName,
			Path:   path,
		},
	}

	studioReaderWriter.On("FindByName", testCtx, existingStudioName, false).Return(&models.Studio{
		ID: existingStudioID,
	}, nil).Once()
	studioReaderWriter.On("FindByName", testCtx, existingStudioErr, false).Return(nil, errors.New("FindByName error")).Once()

	err := i.PreImport(testCtx)
	assert.Nil(t, err)
	assert.Equal(t, int64(existingStudioID), i.gallery.StudioID.Int64)

	i.Input.Studio = existingStudioErr
	err = i.PreImport(testCtx)
	assert.NotNil(t, err)

	studioReaderWriter.AssertExpectations(t)
}

func TestImporterPreImportWithMissingStudio(t *testing.T) {
	studioReaderWriter := &mocks.StudioReaderWriter{}

	i := Importer{
		StudioWriter: studioReaderWriter,
		Input: jsonschema.Gallery{
			Path:   path,
			Studio: missingStudioName,
		},
		MissingRefBehaviour: models.ImportMissingRefEnumFail,
	}

	studioReaderWriter.On("FindByName", testCtx, missingStudioName, false).Return(nil, nil).Times(3)
	studioReaderWriter.On("Create", testCtx, mock.AnythingOfType("models.Studio")).Return(&models.Studio{
		ID: existingStudioID,
	}, nil)

	err := i.PreImport(testCtx)
	assert.NotNil(t, err)

	i.MissingRefBehaviour = models.ImportMissingRefEnumIgnore
	err = i.PreImport(testCtx)
	assert.Nil(t, err)

	i.MissingRefBehaviour = models.ImportMissingRefEnumCreate
	err = i.PreImport(testCtx)
	assert.Nil(t, err)
	assert.Equal(t, int64(existingStudioID), i.gallery.StudioID.Int64)

	studioReaderWriter.AssertExpectations(t)
}

func TestImporterPreImportWithMissingStudioCreateErr(t *testing.T) {
	studioReaderWriter := &mocks.StudioReaderWriter{}

	i := Importer{
		StudioWriter: studioReaderWriter,
		Input: jsonschema.Gallery{
			Path:   path,
			Studio: missingStudioName,
		},
		MissingRefBehaviour: models.ImportMissingRefEnumCreate,
	}

	studioReaderWriter.On("FindByName", testCtx, missingStudioName, false).Return(nil, nil).Once()
	studioReaderWriter.On("Create", testCtx, mock.AnythingOfType("models.Studio")).Return(nil, errors.New("Create error"))

	err := i.PreImport(testCtx)
	assert.NotNil(t, err)
}

func TestImporterPreImportWithPerformer(t *testing.T) {
	performerReaderWriter := &mocks.PerformerReaderWriter{}

	i := Importer{
		PerformerWriter:     performerReaderWriter,
		MissingRefBehaviour: models.ImportMissingRefEnumFail,
		Input: jsonschema.Gallery{
			Path: path,
			Performers: []string{
				existingPerformerName,
			},
		},
	}

	performerReaderWriter.On("FindByNames", testCtx, []string{existingPerformerName}, false).Return([]*models.Performer{
		{
			ID:   existingPerformerID,
			Name: models.NullString(existingPerformerName),
		},
	}, nil).Once()
	performerReaderWriter.On("FindByNames", testCtx, []string{existingPerformerErr}, false).Return(nil, errors.New("FindByNames error")).Once()

	err := i.PreImport(testCtx)
	assert.Nil(t, err)
	assert.Equal(t, existingPerformerID, i.performers[0].ID)

	i.Input.Performers = []string{existingPerformerErr}
	err = i.PreImport(testCtx)
	assert.NotNil(t, err)

	performerReaderWriter.AssertExpectations(t)
}

func TestImporterPreImportWithMissingPerformer(t *testing.T) {
	performerReaderWriter := &mocks.PerformerReaderWriter{}

	i := Importer{
		PerformerWriter: performerReaderWriter,
		Input: jsonschema.Gallery{
			Path: path,
			Performers: []string{
				missingPerformerName,
			},
		},
		MissingRefBehaviour: models.ImportMissingRefEnumFail,
	}

	performerReaderWriter.On("FindByNames", testCtx, []string{missingPerformerName}, false).Return(nil, nil).Times(3)
	performerReaderWriter.On("Create", testCtx, mock.AnythingOfType("models.Performer")).Return(&models.Performer{
		ID: existingPerformerID,
	}, nil)

	err := i.PreImport(testCtx)
	assert.NotNil(t, err)

	i.MissingRefBehaviour = models.ImportMissingRefEnumIgnore
	err = i.PreImport(testCtx)
	assert.Nil(t, err)

	i.MissingRefBehaviour = models.ImportMissingRefEnumCreate
	err = i.PreImport(testCtx)
	assert.Nil(t, err)
	assert.Equal(t, existingPerformerID, i.performers[0].ID)

	performerReaderWriter.AssertExpectations(t)
}

func TestImporterPreImportWithMissingPerformerCreateErr(t *testing.T) {
	performerReaderWriter := &mocks.PerformerReaderWriter{}

	i := Importer{
		PerformerWriter: performerReaderWriter,
		Input: jsonschema.Gallery{
			Path: path,
			Performers: []string{
				missingPerformerName,
			},
		},
		MissingRefBehaviour: models.ImportMissingRefEnumCreate,
	}

	performerReaderWriter.On("FindByNames", testCtx, []string{missingPerformerName}, false).Return(nil, nil).Once()
	performerReaderWriter.On("Create", testCtx, mock.AnythingOfType("models.Performer")).Return(nil, errors.New("Create error"))

	err := i.PreImport(testCtx)
	assert.NotNil(t, err)
}

func TestImporterPreImportWithTag(t *testing.T) {
	tagReaderWriter := &mocks.TagReaderWriter{}

	i := Importer{
		TagWriter:           tagReaderWriter,
		MissingRefBehaviour: models.ImportMissingRefEnumFail,
		Input: jsonschema.Gallery{
			Path: path,
			Tags: []string{
				existingTagName,
			},
		},
	}

	tagReaderWriter.On("FindByNames", testCtx, []string{existingTagName}, false).Return([]*models.Tag{
		{
			ID:   existingTagID,
			Name: existingTagName,
		},
	}, nil).Once()
	tagReaderWriter.On("FindByNames", testCtx, []string{existingTagErr}, false).Return(nil, errors.New("FindByNames error")).Once()

	err := i.PreImport(testCtx)
	assert.Nil(t, err)
	assert.Equal(t, existingTagID, i.tags[0].ID)

	i.Input.Tags = []string{existingTagErr}
	err = i.PreImport(testCtx)
	assert.NotNil(t, err)

	tagReaderWriter.AssertExpectations(t)
}

func TestImporterPreImportWithMissingTag(t *testing.T) {
	tagReaderWriter := &mocks.TagReaderWriter{}

	i := Importer{
		TagWriter: tagReaderWriter,
		Input: jsonschema.Gallery{
			Path: path,
			Tags: []string{
				missingTagName,
			},
		},
		MissingRefBehaviour: models.ImportMissingRefEnumFail,
	}

	tagReaderWriter.On("FindByNames", testCtx, []string{missingTagName}, false).Return(nil, nil).Times(3)
	tagReaderWriter.On("Create", testCtx, mock.AnythingOfType("models.Tag")).Return(&models.Tag{
		ID: existingTagID,
	}, nil)

	err := i.PreImport(testCtx)
	assert.NotNil(t, err)

	i.MissingRefBehaviour = models.ImportMissingRefEnumIgnore
	err = i.PreImport(testCtx)
	assert.Nil(t, err)

	i.MissingRefBehaviour = models.ImportMissingRefEnumCreate
	err = i.PreImport(testCtx)
	assert.Nil(t, err)
	assert.Equal(t, existingTagID, i.tags[0].ID)

	tagReaderWriter.AssertExpectations(t)
}

func TestImporterPreImportWithMissingTagCreateErr(t *testing.T) {
	tagReaderWriter := &mocks.TagReaderWriter{}

	i := Importer{
		TagWriter: tagReaderWriter,
		Input: jsonschema.Gallery{
			Path: path,
			Tags: []string{
				missingTagName,
			},
		},
		MissingRefBehaviour: models.ImportMissingRefEnumCreate,
	}

	tagReaderWriter.On("FindByNames", testCtx, []string{missingTagName}, false).Return(nil, nil).Once()
	tagReaderWriter.On("Create", testCtx, mock.AnythingOfType("models.Tag")).Return(nil, errors.New("Create error"))

	err := i.PreImport(testCtx)
	assert.NotNil(t, err)
}

func TestImporterPostImportUpdatePerformers(t *testing.T) {
	galleryReaderWriter := &mocks.GalleryReaderWriter{}

	i := Importer{
		ReaderWriter: galleryReaderWriter,
		performers: []*models.Performer{
			{
				ID: existingPerformerID,
			},
		},
	}

	updateErr := errors.New("UpdatePerformers error")

	galleryReaderWriter.On("UpdatePerformers", testCtx, galleryID, []int{existingPerformerID}).Return(nil).Once()
	galleryReaderWriter.On("UpdatePerformers", testCtx, errPerformersID, mock.AnythingOfType("[]int")).Return(updateErr).Once()

	err := i.PostImport(testCtx, galleryID)
	assert.Nil(t, err)

	err = i.PostImport(testCtx, errPerformersID)
	assert.NotNil(t, err)

	galleryReaderWriter.AssertExpectations(t)
}

func TestImporterPostImportUpdateTags(t *testing.T) {
	galleryReaderWriter := &mocks.GalleryReaderWriter{}

	i := Importer{
		ReaderWriter: galleryReaderWriter,
		tags: []*models.Tag{
			{
				ID: existingTagID,
			},
		},
	}

	updateErr := errors.New("UpdateTags error")

	galleryReaderWriter.On("UpdateTags", testCtx, galleryID, []int{existingTagID}).Return(nil).Once()
	galleryReaderWriter.On("UpdateTags", testCtx, errTagsID, mock.AnythingOfType("[]int")).Return(updateErr).Once()

	err := i.PostImport(testCtx, galleryID)
	assert.Nil(t, err)

	err = i.PostImport(testCtx, errTagsID)
	assert.NotNil(t, err)

	galleryReaderWriter.AssertExpectations(t)
}

func TestImporterFindExistingID(t *testing.T) {
	readerWriter := &mocks.GalleryReaderWriter{}

	i := Importer{
		ReaderWriter: readerWriter,
		Input: jsonschema.Gallery{
			Path:     path,
			Checksum: missingChecksum,
		},
	}

	expectedErr := errors.New("FindBy* error")
	readerWriter.On("FindByChecksum", testCtx, missingChecksum).Return(nil, nil).Once()
	readerWriter.On("FindByChecksum", testCtx, checksum).Return(&models.Gallery{
		ID: existingGalleryID,
	}, nil).Once()
	readerWriter.On("FindByChecksum", testCtx, errChecksum).Return(nil, expectedErr).Once()

	id, err := i.FindExistingID(testCtx)
	assert.Nil(t, id)
	assert.Nil(t, err)

	i.Input.Checksum = checksum
	id, err = i.FindExistingID(testCtx)
	assert.Equal(t, existingGalleryID, *id)
	assert.Nil(t, err)

	i.Input.Checksum = errChecksum
	id, err = i.FindExistingID(testCtx)
	assert.Nil(t, id)
	assert.NotNil(t, err)

	readerWriter.AssertExpectations(t)
}

func TestCreate(t *testing.T) {
	readerWriter := &mocks.GalleryReaderWriter{}

	gallery := models.Gallery{
		Title: models.NullString(title),
	}

	galleryErr := models.Gallery{
		Title: models.NullString(galleryNameErr),
	}

	i := Importer{
		ReaderWriter: readerWriter,
		gallery:      gallery,
	}

	errCreate := errors.New("Create error")
	readerWriter.On("Create", testCtx, gallery).Return(&models.Gallery{
		ID: galleryID,
	}, nil).Once()
	readerWriter.On("Create", testCtx, galleryErr).Return(nil, errCreate).Once()

	id, err := i.Create(testCtx)
	assert.Equal(t, galleryID, *id)
	assert.Nil(t, err)

	i.gallery = galleryErr
	id, err = i.Create(testCtx)
	assert.Nil(t, id)
	assert.NotNil(t, err)

	readerWriter.AssertExpectations(t)
}

func TestUpdate(t *testing.T) {
	readerWriter := &mocks.GalleryReaderWriter{}

	gallery := models.Gallery{
		Title: models.NullString(title),
	}

	i := Importer{
		ReaderWriter: readerWriter,
		gallery:      gallery,
	}

	// id needs to be set for the mock input
	gallery.ID = galleryID
	readerWriter.On("Update", testCtx, gallery).Return(nil, nil).Once()

	err := i.Update(testCtx, galleryID)
	assert.Nil(t, err)

	readerWriter.AssertExpectations(t)
}
