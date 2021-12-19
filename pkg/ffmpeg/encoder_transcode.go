package ffmpeg

import (
	"path/filepath"
	"strconv"

	"github.com/stashapp/stash/pkg/models"
)

type TranscodeOptions struct {
	OutputPath       string
	MaxTranscodeSize models.StreamingResolutionEnum
}

func calculateTranscodeScale(probeResult VideoFile, maxTranscodeSize models.StreamingResolutionEnum) string {
	maxSize := 0
	switch maxTranscodeSize {
	case models.StreamingResolutionEnumLow:
		maxSize = 240
	case models.StreamingResolutionEnumStandard:
		maxSize = 480
	case models.StreamingResolutionEnumStandardHd:
		maxSize = 720
	case models.StreamingResolutionEnumFullHd:
		maxSize = 1080
	case models.StreamingResolutionEnumFourK:
		maxSize = 2160
	}

	// get the smaller dimension of the video file
	videoSize := probeResult.Height
	if probeResult.Width < videoSize {
		videoSize = probeResult.Width
	}

	// if our streaming resolution is larger than the video dimension
	// or we are streaming the original resolution, then just set the
	// input width
	if maxSize >= videoSize || maxSize == 0 {
		return "iw:-2"
	}

	// we're setting either the width or height
	// we'll set the smaller dimesion
	if probeResult.Width > probeResult.Height {
		// set the height
		return "-2:" + strconv.Itoa(maxSize)
	}

	return strconv.Itoa(maxSize) + ":-2"
}

func (e *Encoder) Transcode(probeResult VideoFile, options TranscodeOptions) {
	scale := calculateTranscodeScale(probeResult, options.MaxTranscodeSize)
	args := []string{
		"-i", probeResult.Path,
		"-c:v", "libx264",
		"-pix_fmt", "yuv420p",
		"-profile:v", "high",
		"-level", "4.2",
		"-preset", "superfast",
		"-crf", "23",
		"-vf", "scale=" + scale,
		"-c:a", "aac",
		"-strict", "-2",
		options.OutputPath,
	}
	_, _ = e.runTranscode(probeResult, args)
}

func (e *Encoder) TranscodeHLS(probeResult VideoFile, options TranscodeOptions) {
	scale := calculateTranscodeScale(probeResult, options.MaxTranscodeSize)
	args := []string{
		"-i", probeResult.Path,
		"-c:v", "libx264",
		"-pix_fmt", "yuv420p",
		"-profile:v", "high",
		"-level", "4.2",
		"-preset", "superfast",
		"-crf", "23",
		"-force_key_frames:0",
		"-vf", "scale=" + scale,
		"-c:a", "aac",
		"-strict", "-2",
		"-f", "hls",
		"-avoid_negative_ts", "disabled",
		"-hls_time", "3",
		"-hls_segment_type", "mpegts",
		"-hls_playlist_type", "vod",
		"-hls_list_size", "0",
		"-hls_segment_filename", filepath.Join(options.OutputPath, "%d.ts"),
		filepath.Join(options.OutputPath, "playlist.m3u8"),
	}
	_, _ = e.run(probeResult.Path, args, nil)
}

// TranscodeVideo transcodes the video, and removes the audio.
// In some videos where the audio codec is not supported by ffmpeg,
// ffmpeg fails if you try to transcode the audio
func (e *Encoder) TranscodeVideo(probeResult VideoFile, options TranscodeOptions) {
	scale := calculateTranscodeScale(probeResult, options.MaxTranscodeSize)
	args := []string{
		"-i", probeResult.Path,
		"-an",
		"-c:v", "libx264",
		"-pix_fmt", "yuv420p",
		"-profile:v", "high",
		"-level", "4.2",
		"-preset", "superfast",
		"-crf", "23",
		"-vf", "scale=" + scale,
		options.OutputPath,
	}
	_, _ = e.runTranscode(probeResult, args)
}

// TranscodeAudio will copy the video stream as is, and transcode audio.
func (e *Encoder) TranscodeAudio(probeResult VideoFile, options TranscodeOptions) {
	args := []string{
		"-i", probeResult.Path,
		"-c:v", "copy",
		"-c:a", "aac",
		"-strict", "-2",
		options.OutputPath,
	}
	_, _ = e.runTranscode(probeResult, args)
}

// CopyVideo will copy the video stream as is, and drop the audio stream.
func (e *Encoder) CopyVideo(probeResult VideoFile, options TranscodeOptions) {
	args := []string{
		"-i", probeResult.Path,
		"-an",
		"-c:v", "copy",
		options.OutputPath,
	}
	_, _ = e.runTranscode(probeResult, args)
}
