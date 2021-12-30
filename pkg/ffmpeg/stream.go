package ffmpeg

import (
	"context"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/stashapp/stash/pkg/logger"
)

const CopyStreamCodec = "copy"

type Stream struct {
	stdout   io.Reader
	stderr   io.Reader
	process  *os.Process
	options  TranscodeStreamOptions
	mimeType string
}

func (s *Stream) Serve(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", s.mimeType)
	w.WriteHeader(http.StatusOK)

	logger.Infof("[stream] transcoding video file to %s", s.mimeType)

	// stderr must be consumed or the process deadlocks
	go func() {
		stderrData, _ := io.ReadAll(s.stderr)
		stderrString := string(stderrData)
		if len(stderrString) > 0 {
			logger.Debugf("[stream] ffmpeg stderr: %s", stderrString)
		}
	}()

	// handle if client closes the connection
	// this is handled automatically using the context
	_, err := io.Copy(w, s.stdout)
	if err != nil {
		logger.Errorf("[stream] error serving transcoded video file: %s", err.Error())
	}
}

type Codec struct {
	Codec     string
	format    string
	MimeType  string
	extraArgs []string
}

var CodecH264 = Codec{
	Codec:    "libx264",
	format:   "mp4",
	MimeType: MimeMp4,
	extraArgs: []string{
		"-movflags", "frag_keyframe+empty_moov",
		"-pix_fmt", "yuv420p",
		"-preset", "veryfast",
		"-crf", "25",
	},
}

var CodecVP9 = Codec{
	Codec:    "libvpx-vp9",
	format:   "webm",
	MimeType: MimeWebm,
	extraArgs: []string{
		"-deadline", "realtime",
		"-cpu-used", "5",
		"-row-mt", "1",
		"-crf", "30",
		"-b:v", "0",
	},
}

var CodecVP8 = Codec{
	Codec:    "libvpx",
	format:   "webm",
	MimeType: MimeWebm,
	extraArgs: []string{
		"-deadline", "realtime",
		"-cpu-used", "5",
		"-crf", "12",
		"-b:v", "3M",
		"-pix_fmt", "yuv420p",
	},
}

var CodecHEVC = Codec{
	Codec:    "libx265",
	format:   "mp4",
	MimeType: MimeMp4,
	extraArgs: []string{
		"-movflags", "frag_keyframe",
		"-preset", "veryfast",
		"-crf", "30",
	},
}

// it is very common in MKVs to have just the audio codec unsupported
// copy the video stream, transcode the audio and serve as Matroska
var CodecMKVAudio = Codec{
	Codec:    CopyStreamCodec,
	format:   "matroska",
	MimeType: MimeMkv,
	extraArgs: []string{
		"-c:a", "libopus",
		"-b:a", "96k",
		"-vbr", "on",
	},
}

type TranscodeStreamOptions struct {
	ProbeResult      VideoFile
	Codec            Codec
	StartTime        string
	MaxTranscodeSize int
	// transcode the video, remove the audio
	// in some videos where the audio codec is not supported by ffmpeg
	// ffmpeg fails if you try to transcode the audio
	VideoOnly bool
}

func GetTranscodeStreamOptions(probeResult VideoFile, videoCodec Codec, audioCodec AudioCodec) TranscodeStreamOptions {
	options := TranscodeStreamOptions{
		ProbeResult: probeResult,
		Codec:       videoCodec,
	}

	if audioCodec == MissingUnsupported {
		// ffmpeg fails if it trys to transcode a non supported audio codec
		options.VideoOnly = true
	}

	return options
}

func (o TranscodeStreamOptions) getStreamArgs() []string {
	args := []string{
		"-hide_banner",
		"-v", "error",
	}

	if o.StartTime != "" {
		args = append(args, "-ss", o.StartTime)
	}

	args = append(args,
		"-i", o.ProbeResult.Path,
	)

	if o.VideoOnly {
		args = append(args, "-an")
	}

	args = append(args,
		"-c:v", o.Codec.Codec,
	)

	// don't set scale when copying video stream
	if o.Codec.Codec != CopyStreamCodec {
		scale := calculateTranscodeScale(o.ProbeResult, o.MaxTranscodeSize)
		args = append(args,
			"-vf", "scale="+scale,
		)
	}

	if len(o.Codec.extraArgs) > 0 {
		args = append(args, o.Codec.extraArgs...)
	}

	args = append(args,
		// this is needed for 5-channel ac3 files
		"-ac", "2",
		"-f", o.Codec.format,
		"pipe:",
	)

	return args
}

func (e *Encoder) GetTranscodeStream(ctx context.Context, options TranscodeStreamOptions) (*Stream, error) {
	args := options.getStreamArgs()
	cmd := e.commandContext(ctx, args)
	logger.Debugf("Streaming via: %s", strings.Join(cmd.Args, " "))

	stdout, err := cmd.StdoutPipe()
	if nil != err {
		logger.Error("FFMPEG stdout not available: " + err.Error())
		return nil, err
	}

	stderr, err := cmd.StderrPipe()
	if nil != err {
		logger.Error("FFMPEG stderr not available: " + err.Error())
		return nil, err
	}

	if err = cmd.Start(); err != nil {
		return nil, err
	}

	probeResult := options.ProbeResult
	registerRunningEncoder(probeResult.Path, cmd.Process)
	go func() {
		if err := waitAndDeregister(probeResult.Path, cmd); err != nil {
			logger.Warnf("Error while deregistering ffmpeg stream: %v", err)
		}
	}()

	ret := &Stream{
		stdout:   stdout,
		stderr:   stderr,
		process:  cmd.Process,
		options:  options,
		mimeType: options.Codec.MimeType,
	}
	return ret, nil
}
