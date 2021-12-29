package ffmpeg

import (
	"strconv"
)

type TranscodeOptions struct {
	OutputPath       string
	MaxTranscodeSize int
}

func calculateTranscodeScale(probeResult VideoFile, maxTranscodeSize int) string {
	// get the smaller dimension of the video file
	videoSize := probeResult.Height
	if probeResult.Width < videoSize {
		videoSize = probeResult.Width
	}

	// if our streaming resolution is larger than the video dimension
	// or we are streaming the original resolution, then just set the
	// input width
	if maxTranscodeSize >= videoSize || maxTranscodeSize == 0 {
		return "iw:-2"
	}

	// we're setting either the width or height
	// we'll set the smaller dimesion
	if probeResult.Width > probeResult.Height {
		// set the height
		return "-2:" + strconv.Itoa(maxTranscodeSize)
	}

	return strconv.Itoa(maxTranscodeSize) + ":-2"
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
