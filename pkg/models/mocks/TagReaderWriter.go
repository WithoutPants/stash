// Code generated by mockery v0.0.0-dev. DO NOT EDIT.

package mocks

import (
	models "github.com/stashapp/stash/pkg/models"
	mock "github.com/stretchr/testify/mock"
)

// TagReaderWriter is an autogenerated mock type for the TagReaderWriter type
type TagReaderWriter struct {
	mock.Mock
}

// All provides a mock function with given fields:
func (_m *TagReaderWriter) All() ([]*models.Tag, error) {
	ret := _m.Called()

	var r0 []*models.Tag
	if rf, ok := ret.Get(0).(func() []*models.Tag); ok {
		r0 = rf()
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*models.Tag)
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

// Find provides a mock function with given fields: id
func (_m *TagReaderWriter) Find(id int) (*models.Tag, error) {
	ret := _m.Called(id)

	var r0 *models.Tag
	if rf, ok := ret.Get(0).(func(int) *models.Tag); ok {
		r0 = rf(id)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*models.Tag)
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

// FindBySceneID provides a mock function with given fields: sceneID
func (_m *TagReaderWriter) FindBySceneID(sceneID int) ([]*models.Tag, error) {
	ret := _m.Called(sceneID)

	var r0 []*models.Tag
	if rf, ok := ret.Get(0).(func(int) []*models.Tag); ok {
		r0 = rf(sceneID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*models.Tag)
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

// FindBySceneMarkerID provides a mock function with given fields: sceneMarkerID
func (_m *TagReaderWriter) FindBySceneMarkerID(sceneMarkerID int) ([]*models.Tag, error) {
	ret := _m.Called(sceneMarkerID)

	var r0 []*models.Tag
	if rf, ok := ret.Get(0).(func(int) []*models.Tag); ok {
		r0 = rf(sceneMarkerID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*models.Tag)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(sceneMarkerID)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// FindMany provides a mock function with given fields: ids
func (_m *TagReaderWriter) FindMany(ids []int) ([]*models.Tag, error) {
	ret := _m.Called(ids)

	var r0 []*models.Tag
	if rf, ok := ret.Get(0).(func([]int) []*models.Tag); ok {
		r0 = rf(ids)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*models.Tag)
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

// GetTagImage provides a mock function with given fields: tagID
func (_m *TagReaderWriter) GetTagImage(tagID int) ([]byte, error) {
	ret := _m.Called(tagID)

	var r0 []byte
	if rf, ok := ret.Get(0).(func(int) []byte); ok {
		r0 = rf(tagID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]byte)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(tagID)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}
