// Code generated by mockery v0.0.0-dev. DO NOT EDIT.

package mocks

import (
	models "github.com/stashapp/stash/pkg/models"
	mock "github.com/stretchr/testify/mock"
)

// PerformerReaderWriter is an autogenerated mock type for the PerformerReaderWriter type
type PerformerReaderWriter struct {
	mock.Mock
}

// FindNamesBySceneID provides a mock function with given fields: sceneID
func (_m *PerformerReaderWriter) FindNamesBySceneID(sceneID int) ([]*models.Performer, error) {
	ret := _m.Called(sceneID)

	var r0 []*models.Performer
	if rf, ok := ret.Get(0).(func(int) []*models.Performer); ok {
		r0 = rf(sceneID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*models.Performer)
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

// GetPerformerImage provides a mock function with given fields: performerID
func (_m *PerformerReaderWriter) GetPerformerImage(performerID int) ([]byte, error) {
	ret := _m.Called(performerID)

	var r0 []byte
	if rf, ok := ret.Get(0).(func(int) []byte); ok {
		r0 = rf(performerID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]byte)
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