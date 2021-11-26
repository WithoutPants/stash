// Code generated by mockery v0.0.0-dev. DO NOT EDIT.

package mocks

import (
	models "github.com/stashapp/stash/pkg/models"
	mock "github.com/stretchr/testify/mock"
)

// GalleryReaderWriter is an autogenerated mock type for the GalleryReaderWriter type
type GalleryReaderWriter struct {
	mock.Mock
}

// All provides a mock function with given fields:
func (_m *GalleryReaderWriter) All() ([]*models.Gallery, error) {
	ret := _m.Called()

	var r0 []*models.Gallery
	if rf, ok := ret.Get(0).(func() []*models.Gallery); ok {
		r0 = rf()
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*models.Gallery)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func() error); ok {
		r1 = rf()
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// Count provides a mock function with given fields:
func (_m *GalleryReaderWriter) Count() (int, error) {
	ret := _m.Called()

	var r0 int
	if rf, ok := ret.Get(0).(func() int); ok {
		r0 = rf()
	} else {
		r0 = ret.Get(0).(int)
	}

	var r1 error
	if rf, ok := ret.Get(1).(func() error); ok {
		r1 = rf()
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// Create provides a mock function with given fields: newGallery
func (_m *GalleryReaderWriter) Create(newGallery models.Gallery) (*models.Gallery, error) {
	ret := _m.Called(newGallery)

	var r0 *models.Gallery
	if rf, ok := ret.Get(0).(func(models.Gallery) *models.Gallery); ok {
		r0 = rf(newGallery)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*models.Gallery)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(models.Gallery) error); ok {
		r1 = rf(newGallery)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// Destroy provides a mock function with given fields: id
func (_m *GalleryReaderWriter) Destroy(id int) error {
	ret := _m.Called(id)

	var r0 error
	if rf, ok := ret.Get(0).(func(int) error); ok {
		r0 = rf(id)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// Find provides a mock function with given fields: id
func (_m *GalleryReaderWriter) Find(id int) (*models.Gallery, error) {
	ret := _m.Called(id)

	var r0 *models.Gallery
	if rf, ok := ret.Get(0).(func(int) *models.Gallery); ok {
		r0 = rf(id)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*models.Gallery)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(id)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// FindByChecksum provides a mock function with given fields: checksum
func (_m *GalleryReaderWriter) FindByChecksum(checksum string) (*models.Gallery, error) {
	ret := _m.Called(checksum)

	var r0 *models.Gallery
	if rf, ok := ret.Get(0).(func(string) *models.Gallery); ok {
		r0 = rf(checksum)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*models.Gallery)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(string) error); ok {
		r1 = rf(checksum)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// FindByChecksums provides a mock function with given fields: checksums
func (_m *GalleryReaderWriter) FindByChecksums(checksums []string) ([]*models.Gallery, error) {
	ret := _m.Called(checksums)

	var r0 []*models.Gallery
	if rf, ok := ret.Get(0).(func([]string) []*models.Gallery); ok {
		r0 = rf(checksums)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*models.Gallery)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func([]string) error); ok {
		r1 = rf(checksums)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// FindByFileID provides a mock function with given fields: fileID
func (_m *GalleryReaderWriter) FindByFileID(fileID int) ([]*models.Gallery, error) {
	ret := _m.Called(fileID)

	var r0 []*models.Gallery
	if rf, ok := ret.Get(0).(func(int) []*models.Gallery); ok {
		r0 = rf(fileID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*models.Gallery)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(fileID)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// FindByImageID provides a mock function with given fields: imageID
func (_m *GalleryReaderWriter) FindByImageID(imageID int) ([]*models.Gallery, error) {
	ret := _m.Called(imageID)

	var r0 []*models.Gallery
	if rf, ok := ret.Get(0).(func(int) []*models.Gallery); ok {
		r0 = rf(imageID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*models.Gallery)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(imageID)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// FindByPath provides a mock function with given fields: path
func (_m *GalleryReaderWriter) FindByPath(path string) (*models.Gallery, error) {
	ret := _m.Called(path)

	var r0 *models.Gallery
	if rf, ok := ret.Get(0).(func(string) *models.Gallery); ok {
		r0 = rf(path)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*models.Gallery)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(string) error); ok {
		r1 = rf(path)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// FindBySceneID provides a mock function with given fields: sceneID
func (_m *GalleryReaderWriter) FindBySceneID(sceneID int) ([]*models.Gallery, error) {
	ret := _m.Called(sceneID)

	var r0 []*models.Gallery
	if rf, ok := ret.Get(0).(func(int) []*models.Gallery); ok {
		r0 = rf(sceneID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*models.Gallery)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(sceneID)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// FindMany provides a mock function with given fields: ids
func (_m *GalleryReaderWriter) FindMany(ids []int) ([]*models.Gallery, error) {
	ret := _m.Called(ids)

	var r0 []*models.Gallery
	if rf, ok := ret.Get(0).(func([]int) []*models.Gallery); ok {
		r0 = rf(ids)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*models.Gallery)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func([]int) error); ok {
		r1 = rf(ids)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetFileIDs provides a mock function with given fields: id
func (_m *GalleryReaderWriter) GetFileIDs(id int) ([]int, error) {
	ret := _m.Called(id)

	var r0 []int
	if rf, ok := ret.Get(0).(func(int) []int); ok {
		r0 = rf(id)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]int)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(id)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetImageIDs provides a mock function with given fields: galleryID
func (_m *GalleryReaderWriter) GetImageIDs(galleryID int) ([]int, error) {
	ret := _m.Called(galleryID)

	var r0 []int
	if rf, ok := ret.Get(0).(func(int) []int); ok {
		r0 = rf(galleryID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]int)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(galleryID)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetPerformerIDs provides a mock function with given fields: galleryID
func (_m *GalleryReaderWriter) GetPerformerIDs(galleryID int) ([]int, error) {
	ret := _m.Called(galleryID)

	var r0 []int
	if rf, ok := ret.Get(0).(func(int) []int); ok {
		r0 = rf(galleryID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]int)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(galleryID)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetSceneIDs provides a mock function with given fields: galleryID
func (_m *GalleryReaderWriter) GetSceneIDs(galleryID int) ([]int, error) {
	ret := _m.Called(galleryID)

	var r0 []int
	if rf, ok := ret.Get(0).(func(int) []int); ok {
		r0 = rf(galleryID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]int)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(galleryID)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetTagIDs provides a mock function with given fields: galleryID
func (_m *GalleryReaderWriter) GetTagIDs(galleryID int) ([]int, error) {
	ret := _m.Called(galleryID)

	var r0 []int
	if rf, ok := ret.Get(0).(func(int) []int); ok {
		r0 = rf(galleryID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]int)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(galleryID)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// Query provides a mock function with given fields: galleryFilter, findFilter
func (_m *GalleryReaderWriter) Query(galleryFilter *models.GalleryFilterType, findFilter *models.FindFilterType) ([]*models.Gallery, int, error) {
	ret := _m.Called(galleryFilter, findFilter)

	var r0 []*models.Gallery
	if rf, ok := ret.Get(0).(func(*models.GalleryFilterType, *models.FindFilterType) []*models.Gallery); ok {
		r0 = rf(galleryFilter, findFilter)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*models.Gallery)
		}
	}

	var r1 int
	if rf, ok := ret.Get(1).(func(*models.GalleryFilterType, *models.FindFilterType) int); ok {
		r1 = rf(galleryFilter, findFilter)
	} else {
		r1 = ret.Get(1).(int)
	}

	var r2 error
	if rf, ok := ret.Get(2).(func(*models.GalleryFilterType, *models.FindFilterType) error); ok {
		r2 = rf(galleryFilter, findFilter)
	} else {
		r2 = ret.Error(2)
	}

	return r0, r1, r2
}

// QueryCount provides a mock function with given fields: galleryFilter, findFilter
func (_m *GalleryReaderWriter) QueryCount(galleryFilter *models.GalleryFilterType, findFilter *models.FindFilterType) (int, error) {
	ret := _m.Called(galleryFilter, findFilter)

	var r0 int
	if rf, ok := ret.Get(0).(func(*models.GalleryFilterType, *models.FindFilterType) int); ok {
		r0 = rf(galleryFilter, findFilter)
	} else {
		r0 = ret.Get(0).(int)
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(*models.GalleryFilterType, *models.FindFilterType) error); ok {
		r1 = rf(galleryFilter, findFilter)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// Update provides a mock function with given fields: updatedGallery
func (_m *GalleryReaderWriter) Update(updatedGallery models.Gallery) (*models.Gallery, error) {
	ret := _m.Called(updatedGallery)

	var r0 *models.Gallery
	if rf, ok := ret.Get(0).(func(models.Gallery) *models.Gallery); ok {
		r0 = rf(updatedGallery)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*models.Gallery)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(models.Gallery) error); ok {
		r1 = rf(updatedGallery)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// UpdateFileModTime provides a mock function with given fields: id, modTime
func (_m *GalleryReaderWriter) UpdateFileModTime(id int, modTime models.NullSQLiteTimestamp) error {
	ret := _m.Called(id, modTime)

	var r0 error
	if rf, ok := ret.Get(0).(func(int, models.NullSQLiteTimestamp) error); ok {
		r0 = rf(id, modTime)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// UpdateFiles provides a mock function with given fields: id, fileIDs
func (_m *GalleryReaderWriter) UpdateFiles(id int, fileIDs []int) error {
	ret := _m.Called(id, fileIDs)

	var r0 error
	if rf, ok := ret.Get(0).(func(int, []int) error); ok {
		r0 = rf(id, fileIDs)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// UpdateImages provides a mock function with given fields: galleryID, imageIDs
func (_m *GalleryReaderWriter) UpdateImages(galleryID int, imageIDs []int) error {
	ret := _m.Called(galleryID, imageIDs)

	var r0 error
	if rf, ok := ret.Get(0).(func(int, []int) error); ok {
		r0 = rf(galleryID, imageIDs)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// UpdatePartial provides a mock function with given fields: updatedGallery
func (_m *GalleryReaderWriter) UpdatePartial(updatedGallery models.GalleryPartial) (*models.Gallery, error) {
	ret := _m.Called(updatedGallery)

	var r0 *models.Gallery
	if rf, ok := ret.Get(0).(func(models.GalleryPartial) *models.Gallery); ok {
		r0 = rf(updatedGallery)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*models.Gallery)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(models.GalleryPartial) error); ok {
		r1 = rf(updatedGallery)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// UpdatePerformers provides a mock function with given fields: galleryID, performerIDs
func (_m *GalleryReaderWriter) UpdatePerformers(galleryID int, performerIDs []int) error {
	ret := _m.Called(galleryID, performerIDs)

	var r0 error
	if rf, ok := ret.Get(0).(func(int, []int) error); ok {
		r0 = rf(galleryID, performerIDs)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// UpdateScenes provides a mock function with given fields: galleryID, sceneIDs
func (_m *GalleryReaderWriter) UpdateScenes(galleryID int, sceneIDs []int) error {
	ret := _m.Called(galleryID, sceneIDs)

	var r0 error
	if rf, ok := ret.Get(0).(func(int, []int) error); ok {
		r0 = rf(galleryID, sceneIDs)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// UpdateTags provides a mock function with given fields: galleryID, tagIDs
func (_m *GalleryReaderWriter) UpdateTags(galleryID int, tagIDs []int) error {
	ret := _m.Called(galleryID, tagIDs)

	var r0 error
	if rf, ok := ret.Get(0).(func(int, []int) error); ok {
		r0 = rf(galleryID, tagIDs)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}
