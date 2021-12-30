package models

// MaxSize returns the maximum number of horizontal or vertical pixels when streaming.
func (e StreamingResolutionEnum) MaxSize() int {
	maxSize := 0

	switch e {
	case StreamingResolutionEnumLow:
		maxSize = 240
	case StreamingResolutionEnumStandard:
		maxSize = 480
	case StreamingResolutionEnumStandardHd:
		maxSize = 720
	case StreamingResolutionEnumFullHd:
		maxSize = 1080
	case StreamingResolutionEnumFourK:
		maxSize = 2160
	}

	return maxSize
}
