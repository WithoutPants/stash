// Code generated by mockery v0.0.0-dev. DO NOT EDIT.

package mocks

import (
	models "github.com/stashapp/stash/pkg/models"
	mock "github.com/stretchr/testify/mock"
)

// SceneReaderWriter is an autogenerated mock type for the SceneReaderWriter type
type SceneReaderWriter struct {
	mock.Mock
}

// All provides a mock function with given fields:
func (_m *SceneReaderWriter) All() ([]*models.Scene, error) {
	ret := _m.Called()

	var r0 []*models.Scene
	if rf, ok := ret.Get(0).(func() []*models.Scene); ok {
		r0 = rf()
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*models.Scene)
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
func (_m *SceneReaderWriter) Count() (int, error) {
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

// CountByMovieID provides a mock function with given fields: movieID
func (_m *SceneReaderWriter) CountByMovieID(movieID int) (int, error) {
	ret := _m.Called(movieID)

	var r0 int
	if rf, ok := ret.Get(0).(func(int) int); ok {
		r0 = rf(movieID)
	} else {
		r0 = ret.Get(0).(int)
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(movieID)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// CountByPerformerID provides a mock function with given fields: performerID
func (_m *SceneReaderWriter) CountByPerformerID(performerID int) (int, error) {
	ret := _m.Called(performerID)

	var r0 int
	if rf, ok := ret.Get(0).(func(int) int); ok {
		r0 = rf(performerID)
	} else {
		r0 = ret.Get(0).(int)
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(performerID)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// CountByStudioID provides a mock function with given fields: studioID
func (_m *SceneReaderWriter) CountByStudioID(studioID int) (int, error) {
	ret := _m.Called(studioID)

	var r0 int
	if rf, ok := ret.Get(0).(func(int) int); ok {
		r0 = rf(studioID)
	} else {
		r0 = ret.Get(0).(int)
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(studioID)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// CountByTagID provides a mock function with given fields: tagID
func (_m *SceneReaderWriter) CountByTagID(tagID int) (int, error) {
	ret := _m.Called(tagID)

	var r0 int
	if rf, ok := ret.Get(0).(func(int) int); ok {
		r0 = rf(tagID)
	} else {
		r0 = ret.Get(0).(int)
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(tagID)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// CountMissingChecksum provides a mock function with given fields:
func (_m *SceneReaderWriter) CountMissingChecksum() (int, error) {
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

// CountMissingOSHash provides a mock function with given fields:
func (_m *SceneReaderWriter) CountMissingOSHash() (int, error) {
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

// Create provides a mock function with given fields: newScene
func (_m *SceneReaderWriter) Create(newScene models.Scene) (*models.Scene, error) {
	ret := _m.Called(newScene)

	var r0 *models.Scene
	if rf, ok := ret.Get(0).(func(models.Scene) *models.Scene); ok {
		r0 = rf(newScene)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*models.Scene)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(models.Scene) error); ok {
		r1 = rf(newScene)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// DecrementOCounter provides a mock function with given fields: id
func (_m *SceneReaderWriter) DecrementOCounter(id int) (int, error) {
	ret := _m.Called(id)

	var r0 int
	if rf, ok := ret.Get(0).(func(int) int); ok {
		r0 = rf(id)
	} else {
		r0 = ret.Get(0).(int)
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(id)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// Destroy provides a mock function with given fields: id
func (_m *SceneReaderWriter) Destroy(id int) error {
	ret := _m.Called(id)

	var r0 error
	if rf, ok := ret.Get(0).(func(int) error); ok {
		r0 = rf(id)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// DestroyCover provides a mock function with given fields: sceneID
func (_m *SceneReaderWriter) DestroyCover(sceneID int) error {
	ret := _m.Called(sceneID)

	var r0 error
	if rf, ok := ret.Get(0).(func(int) error); ok {
		r0 = rf(sceneID)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// Find provides a mock function with given fields: id
func (_m *SceneReaderWriter) Find(id int) (*models.Scene, error) {
	ret := _m.Called(id)

	var r0 *models.Scene
	if rf, ok := ret.Get(0).(func(int) *models.Scene); ok {
		r0 = rf(id)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*models.Scene)
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
func (_m *SceneReaderWriter) FindByChecksum(checksum string) (*models.Scene, error) {
	ret := _m.Called(checksum)

	var r0 *models.Scene
	if rf, ok := ret.Get(0).(func(string) *models.Scene); ok {
		r0 = rf(checksum)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*models.Scene)
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

// FindByMovieID provides a mock function with given fields: movieID
func (_m *SceneReaderWriter) FindByMovieID(movieID int) ([]*models.Scene, error) {
	ret := _m.Called(movieID)

	var r0 []*models.Scene
	if rf, ok := ret.Get(0).(func(int) []*models.Scene); ok {
		r0 = rf(movieID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*models.Scene)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(movieID)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// FindByOSHash provides a mock function with given fields: oshash
func (_m *SceneReaderWriter) FindByOSHash(oshash string) (*models.Scene, error) {
	ret := _m.Called(oshash)

	var r0 *models.Scene
	if rf, ok := ret.Get(0).(func(string) *models.Scene); ok {
		r0 = rf(oshash)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*models.Scene)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(string) error); ok {
		r1 = rf(oshash)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// FindByPath provides a mock function with given fields: path
func (_m *SceneReaderWriter) FindByPath(path string) (*models.Scene, error) {
	ret := _m.Called(path)

	var r0 *models.Scene
	if rf, ok := ret.Get(0).(func(string) *models.Scene); ok {
		r0 = rf(path)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*models.Scene)
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

// FindByPerformerID provides a mock function with given fields: performerID
func (_m *SceneReaderWriter) FindByPerformerID(performerID int) ([]*models.Scene, error) {
	ret := _m.Called(performerID)

	var r0 []*models.Scene
	if rf, ok := ret.Get(0).(func(int) []*models.Scene); ok {
		r0 = rf(performerID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*models.Scene)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(performerID)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// FindMany provides a mock function with given fields: ids
func (_m *SceneReaderWriter) FindMany(ids []int) ([]*models.Scene, error) {
	ret := _m.Called(ids)

	var r0 []*models.Scene
	if rf, ok := ret.Get(0).(func([]int) []*models.Scene); ok {
		r0 = rf(ids)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*models.Scene)
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

// GetCover provides a mock function with given fields: sceneID
func (_m *SceneReaderWriter) GetCover(sceneID int) ([]byte, error) {
	ret := _m.Called(sceneID)

	var r0 []byte
	if rf, ok := ret.Get(0).(func(int) []byte); ok {
		r0 = rf(sceneID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]byte)
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

// GetMovies provides a mock function with given fields: sceneID
func (_m *SceneReaderWriter) GetMovies(sceneID int) ([]models.MoviesScenes, error) {
	ret := _m.Called(sceneID)

	var r0 []models.MoviesScenes
	if rf, ok := ret.Get(0).(func(int) []models.MoviesScenes); ok {
		r0 = rf(sceneID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]models.MoviesScenes)
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

// GetPerformerIDs provides a mock function with given fields: imageID
func (_m *SceneReaderWriter) GetPerformerIDs(imageID int) ([]int, error) {
	ret := _m.Called(imageID)

	var r0 []int
	if rf, ok := ret.Get(0).(func(int) []int); ok {
		r0 = rf(imageID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]int)
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

// GetStashIDs provides a mock function with given fields: performerID
func (_m *SceneReaderWriter) GetStashIDs(performerID int) ([]*models.StashID, error) {
	ret := _m.Called(performerID)

	var r0 []*models.StashID
	if rf, ok := ret.Get(0).(func(int) []*models.StashID); ok {
		r0 = rf(performerID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*models.StashID)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(performerID)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetTagIDs provides a mock function with given fields: imageID
func (_m *SceneReaderWriter) GetTagIDs(imageID int) ([]int, error) {
	ret := _m.Called(imageID)

	var r0 []int
	if rf, ok := ret.Get(0).(func(int) []int); ok {
		r0 = rf(imageID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]int)
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

// IncrementOCounter provides a mock function with given fields: id
func (_m *SceneReaderWriter) IncrementOCounter(id int) (int, error) {
	ret := _m.Called(id)

	var r0 int
	if rf, ok := ret.Get(0).(func(int) int); ok {
		r0 = rf(id)
	} else {
		r0 = ret.Get(0).(int)
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(id)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// Query provides a mock function with given fields: sceneFilter, findFilter
func (_m *SceneReaderWriter) Query(sceneFilter *models.SceneFilterType, findFilter *models.FindFilterType) ([]*models.Scene, int, error) {
	ret := _m.Called(sceneFilter, findFilter)

	var r0 []*models.Scene
	if rf, ok := ret.Get(0).(func(*models.SceneFilterType, *models.FindFilterType) []*models.Scene); ok {
		r0 = rf(sceneFilter, findFilter)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*models.Scene)
		}
	}

	var r1 int
	if rf, ok := ret.Get(1).(func(*models.SceneFilterType, *models.FindFilterType) int); ok {
		r1 = rf(sceneFilter, findFilter)
	} else {
		r1 = ret.Get(1).(int)
	}

	var r2 error
	if rf, ok := ret.Get(2).(func(*models.SceneFilterType, *models.FindFilterType) error); ok {
		r2 = rf(sceneFilter, findFilter)
	} else {
		r2 = ret.Error(2)
	}

	return r0, r1, r2
}

// QueryAllByPathRegex provides a mock function with given fields: regex, ignoreOrganized
func (_m *SceneReaderWriter) QueryAllByPathRegex(regex string, ignoreOrganized bool) ([]*models.Scene, error) {
	ret := _m.Called(regex, ignoreOrganized)

	var r0 []*models.Scene
	if rf, ok := ret.Get(0).(func(string, bool) []*models.Scene); ok {
		r0 = rf(regex, ignoreOrganized)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*models.Scene)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(string, bool) error); ok {
		r1 = rf(regex, ignoreOrganized)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// QueryByPathRegex provides a mock function with given fields: findFilter
func (_m *SceneReaderWriter) QueryByPathRegex(findFilter *models.FindFilterType) ([]*models.Scene, int, error) {
	ret := _m.Called(findFilter)

	var r0 []*models.Scene
	if rf, ok := ret.Get(0).(func(*models.FindFilterType) []*models.Scene); ok {
		r0 = rf(findFilter)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*models.Scene)
		}
	}

	var r1 int
	if rf, ok := ret.Get(1).(func(*models.FindFilterType) int); ok {
		r1 = rf(findFilter)
	} else {
		r1 = ret.Get(1).(int)
	}

	var r2 error
	if rf, ok := ret.Get(2).(func(*models.FindFilterType) error); ok {
		r2 = rf(findFilter)
	} else {
		r2 = ret.Error(2)
	}

	return r0, r1, r2
}

// ResetOCounter provides a mock function with given fields: id
func (_m *SceneReaderWriter) ResetOCounter(id int) (int, error) {
	ret := _m.Called(id)

	var r0 int
	if rf, ok := ret.Get(0).(func(int) int); ok {
		r0 = rf(id)
	} else {
		r0 = ret.Get(0).(int)
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(id)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// Size provides a mock function with given fields:
func (_m *SceneReaderWriter) Size() (float64, error) {
	ret := _m.Called()

	var r0 float64
	if rf, ok := ret.Get(0).(func() float64); ok {
		r0 = rf()
	} else {
		r0 = ret.Get(0).(float64)
	}

	var r1 error
	if rf, ok := ret.Get(1).(func() error); ok {
		r1 = rf()
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// Update provides a mock function with given fields: updatedScene
func (_m *SceneReaderWriter) Update(updatedScene models.ScenePartial) (*models.Scene, error) {
	ret := _m.Called(updatedScene)

	var r0 *models.Scene
	if rf, ok := ret.Get(0).(func(models.ScenePartial) *models.Scene); ok {
		r0 = rf(updatedScene)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*models.Scene)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(models.ScenePartial) error); ok {
		r1 = rf(updatedScene)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// UpdateCover provides a mock function with given fields: sceneID, cover
func (_m *SceneReaderWriter) UpdateCover(sceneID int, cover []byte) error {
	ret := _m.Called(sceneID, cover)

	var r0 error
	if rf, ok := ret.Get(0).(func(int, []byte) error); ok {
		r0 = rf(sceneID, cover)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// UpdateFileModTime provides a mock function with given fields: id, modTime
func (_m *SceneReaderWriter) UpdateFileModTime(id int, modTime models.NullSQLiteTimestamp) error {
	ret := _m.Called(id, modTime)

	var r0 error
	if rf, ok := ret.Get(0).(func(int, models.NullSQLiteTimestamp) error); ok {
		r0 = rf(id, modTime)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// UpdateFull provides a mock function with given fields: updatedScene
func (_m *SceneReaderWriter) UpdateFull(updatedScene models.Scene) (*models.Scene, error) {
	ret := _m.Called(updatedScene)

	var r0 *models.Scene
	if rf, ok := ret.Get(0).(func(models.Scene) *models.Scene); ok {
		r0 = rf(updatedScene)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*models.Scene)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(models.Scene) error); ok {
		r1 = rf(updatedScene)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// UpdateMovies provides a mock function with given fields: sceneID, movies
func (_m *SceneReaderWriter) UpdateMovies(sceneID int, movies []models.MoviesScenes) error {
	ret := _m.Called(sceneID, movies)

	var r0 error
	if rf, ok := ret.Get(0).(func(int, []models.MoviesScenes) error); ok {
		r0 = rf(sceneID, movies)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// UpdatePerformers provides a mock function with given fields: sceneID, performerIDs
func (_m *SceneReaderWriter) UpdatePerformers(sceneID int, performerIDs []int) error {
	ret := _m.Called(sceneID, performerIDs)

	var r0 error
	if rf, ok := ret.Get(0).(func(int, []int) error); ok {
		r0 = rf(sceneID, performerIDs)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// UpdateStashIDs provides a mock function with given fields: sceneID, stashIDs
func (_m *SceneReaderWriter) UpdateStashIDs(sceneID int, stashIDs []models.StashID) error {
	ret := _m.Called(sceneID, stashIDs)

	var r0 error
	if rf, ok := ret.Get(0).(func(int, []models.StashID) error); ok {
		r0 = rf(sceneID, stashIDs)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// UpdateTags provides a mock function with given fields: sceneID, tagIDs
func (_m *SceneReaderWriter) UpdateTags(sceneID int, tagIDs []int) error {
	ret := _m.Called(sceneID, tagIDs)

	var r0 error
	if rf, ok := ret.Get(0).(func(int, []int) error); ok {
		r0 = rf(sceneID, tagIDs)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// Wall provides a mock function with given fields: q
func (_m *SceneReaderWriter) Wall(q *string) ([]*models.Scene, error) {
	ret := _m.Called(q)

	var r0 []*models.Scene
	if rf, ok := ret.Get(0).(func(*string) []*models.Scene); ok {
		r0 = rf(q)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*models.Scene)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(*string) error); ok {
		r1 = rf(q)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}
