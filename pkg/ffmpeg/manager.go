package ffmpeg

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"io/fs"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/stashapp/stash/pkg/logger"
	"github.com/stashapp/stash/pkg/models"
	"github.com/stashapp/stash/pkg/utils"
)

const (
	hlsSegmentLength = 2

	maxSegmentWait       = 5 * time.Second
	segmentCheckInterval = 100 * time.Millisecond

	maxSegmentGap = 10
)

type transcodeProcess struct {
	cmd          *exec.Cmd
	hash         string
	startSegment int
}

type StreamManager struct {
	cacheDir         string
	encoder          Encoder
	ffprobe          FFProbe
	maxTranscodeSize models.StreamingResolutionEnum

	context context.Context

	runningTranscodes map[string]*transcodeProcess
	transcodesMutex   sync.Mutex

	runningStreams map[string]time.Time
	streamsMutex   sync.Mutex
}

func NewStreamManager(cacheDir string, encoder Encoder, ffprobe FFProbe, maxTranscodeSize models.StreamingResolutionEnum) *StreamManager {
	return &StreamManager{
		cacheDir:          cacheDir,
		encoder:           encoder,
		ffprobe:           ffprobe,
		maxTranscodeSize:  maxTranscodeSize,
		context:           context.Background(),
		runningTranscodes: make(map[string]*transcodeProcess),
		runningStreams:    make(map[string]time.Time),
	}
}

// WriteHLSPlaylist writes a playlist manifest to w. The URLs for the segments
// are generated using urlFormat. urlFormat is expected to include a single
// %d argument, which will be populated with the segment index.
func (sm *StreamManager) WriteHLSPlaylist(duration float64, urlFormat string, w io.Writer) {
	fmt.Fprint(w, "#EXTM3U\n")
	fmt.Fprint(w, "#EXT-X-VERSION:3\n")
	fmt.Fprint(w, "#EXT-X-MEDIA-SEQUENCE:0\n")
	fmt.Fprintf(w, "#EXT-X-TARGETDURATION:%d\n", hlsSegmentLength)
	fmt.Fprint(w, "#EXT-X-PLAYLIST-TYPE:VOD\n")

	leftover := duration
	segment := 0

	for leftover > 0 {
		thisLength := float64(hlsSegmentLength)
		if leftover < thisLength {
			thisLength = leftover
		}

		fmt.Fprintf(w, "#EXTINF:%f,\n", thisLength)
		fmt.Fprintf(w, urlFormat+"\n", segment)

		leftover -= thisLength
		segment++
	}

	fmt.Fprint(w, "#EXT-X-ENDLIST\n")
}

func (sm *StreamManager) segmentDirectory(hash string) string {
	return filepath.Join(sm.cacheDir, hash)
}

func (sm *StreamManager) segmentFilename(hash string, segment int) string {
	return filepath.Join(sm.segmentDirectory(hash), fmt.Sprintf("%d.ts", segment))
}

func (sm *StreamManager) segmentExists(segmentFilename string) bool {
	exists, _ := utils.FileExists(segmentFilename)
	return exists
}

// lastTranscodedSegment returns the most recent segment file created. Returns -1 if no files are found.
func (sm *StreamManager) lastTranscodedSegment(hash string) int {
	files, _ := ioutil.ReadDir(sm.segmentDirectory(hash))

	var mostRecent fs.FileInfo
	for _, f := range files {
		if mostRecent == nil || f.ModTime().After(mostRecent.ModTime()) {
			mostRecent = f
		}
	}

	segment := -1
	if mostRecent != nil {
		_, _ = fmt.Sscanf(filepath.Base(mostRecent.Name()), "%d.ts", &segment)
	}

	return segment
}

func (sm *StreamManager) streamNotify(ctx context.Context, hash string) {
	sm.streamsMutex.Lock()
	sm.runningStreams[hash] = time.Now()
	sm.streamsMutex.Unlock()

	go func() {
		<-ctx.Done()

		sm.streamsMutex.Lock()
		sm.runningStreams[hash] = time.Now()
		sm.streamsMutex.Unlock()
	}()
}

func (sm *StreamManager) streamTSFunc(hash string, fn string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sm.streamNotify(r.Context(), hash)
		w.Header().Set("Content-Type", "video/mp2t")
		http.ServeFile(w, r, fn)
	}
}

func (sm *StreamManager) waitAndStreamTSFunc(hash string, fn string) http.HandlerFunc {
	started := time.Now()

	logger.Debugf("waiting for segment file %q to be generated", fn)
	for {
		if sm.segmentExists(fn) {
			// TODO - may need to wait for transcode process to finish writing the file first
			return sm.streamTSFunc(hash, fn)
		}

		now := time.Now()
		if started.Add(maxSegmentWait).Before(now) {
			logger.Warnf("timed out waiting for segment file %q to be generated", fn)

			return func(w http.ResponseWriter, r *http.Request) {
				http.Error(w, "timed out waiting for segment file to be generated", http.StatusInternalServerError)
			}
		}

		time.Sleep(segmentCheckInterval)
	}
}

func (sm *StreamManager) StreamTS(src string, hash string, segment int) http.HandlerFunc {
	onTranscodeError := func(err error) http.HandlerFunc {
		errStr := fmt.Sprintf("error starting transcode process: %v", err.Error())
		logger.Error(errStr)

		return func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, errStr, http.StatusInternalServerError)
		}
	}

	segmentFilename := sm.segmentFilename(hash, segment)

	// check if transcoded file already exists
	// TODO - may need to wait for transcode process to finish writing the file first
	// if so, return it
	if sm.segmentExists(segmentFilename) {
		return sm.streamTSFunc(hash, segmentFilename)
	}

	// check if transcoding process is already running
	// lock the mutex here to ensure we don't start multiple processes
	sm.transcodesMutex.Lock()

	tp := sm.runningTranscodes[hash]

	// if not, start one at the applicable time, wait and return stream
	if tp == nil {
		var err error
		_, err = sm.startTranscode(src, hash, segment)
		sm.transcodesMutex.Unlock()

		if err != nil {
			return onTranscodeError(err)
		}

		return sm.waitAndStreamTSFunc(hash, segmentFilename)
	}

	// check if transcoding process is about to transcode the necessary segment
	lastSegment := sm.lastTranscodedSegment(hash)

	if lastSegment <= segment && lastSegment+maxSegmentGap >= segment {
		// if so, wait and return
		sm.transcodesMutex.Unlock()
		return sm.waitAndStreamTSFunc(hash, segmentFilename)
	}

	logger.Debugf("restarting transcode since up to segment #%d and #%d was requested", lastSegment, segment)

	// otherwise, stop the existing transcoding process, restart at the applicable time
	// wait and return stream
	sm.stopTranscode(hash)

	_, err := sm.startTranscode(src, hash, segment)
	sm.transcodesMutex.Unlock()

	if err != nil {
		return onTranscodeError(err)
	}
	return sm.waitAndStreamTSFunc(hash, segmentFilename)
}

func (sm *StreamManager) segmentToTime(segment int) string {
	return fmt.Sprint(segment * hlsSegmentLength)
}

func (sm *StreamManager) getTranscodeArgs(probeResult *VideoFile, outputPath string, segment int) []string {
	scale := calculateTranscodeScale(*probeResult, sm.maxTranscodeSize)

	var args []string

	if segment > 0 {
		args = append(args, "-ss", sm.segmentToTime(segment))
	}

	args = append(args,
		"-i", probeResult.Path,
		"-c:v", "libx264",
		"-pix_fmt", "yuv420p",
		"-profile:v", "high",
		"-level", "4.2",
		"-preset", "superfast",
		"-crf", "23",
		"-r", "30",
		"-g", "60",
		"-x264-params", "no-scenecut=1",
		"-force_key_frames", "0",
		"-vf", "scale="+scale,
		"-c:a", "aac",
		// this is needed for 5-channel ac3 files
		"-ac", "2",
		"-copyts",
		"-avoid_negative_ts", "disabled",
		"-strict", "-2",
		"-f", "hls",
		"-start_number", fmt.Sprint(segment),
		"-hls_time", "2",
		"-hls_segment_type", "mpegts",
		"-hls_playlist_type", "vod",
		"-hls_list_size", "0",
		"-hls_segment_filename", filepath.Join(outputPath, "%d.ts"),
		filepath.Join(outputPath, "playlist.m3u8"),
	)

	return args
}

// assumes mutex is held
func (sm *StreamManager) startTranscode(src string, hash string, segment int) (*transcodeProcess, error) {
	probeResult, err := sm.ffprobe.NewVideoFile(src, false)
	if err != nil {
		return nil, err
	}

	outputPath := sm.segmentDirectory(hash)
	if err := os.MkdirAll(outputPath, os.ModePerm); err != nil {
		return nil, err
	}

	args := sm.getTranscodeArgs(probeResult, outputPath, segment)
	cmd := sm.encoder.command(args)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	logger.Tracef("running %s", cmd.String())
	if err := cmd.Start(); err != nil {
		return nil, err
	}

	p := &transcodeProcess{
		cmd:          cmd,
		hash:         hash,
		startSegment: segment,
	}
	sm.runningTranscodes[hash] = p

	go sm.waitAndDeregister(hash, p, stdout, stderr)

	return p, nil
}

// assumes mutex is held
func (sm *StreamManager) stopTranscode(hash string) {
	p := sm.runningTranscodes[hash]
	if p != nil {
		process := p.cmd.Process

		if err := process.Kill(); err != nil {
			logger.Warnf("failed to kill process %v: %v", process.Pid, err)
		}

		delete(sm.runningTranscodes, hash)
	}
}

func (sm *StreamManager) waitAndDeregister(hash string, p *transcodeProcess, stdout, stderr bytes.Buffer) {
	cmd := p.cmd
	err := cmd.Wait()

	if err != nil {
		errStr := stderr.String()
		if errStr == "" {
			errStr = stdout.String()
		}

		// error message should be in the stderr stream
		logger.Errorf("ffmpeg error when running command <%s>: %s", strings.Join(cmd.Args, " "), errStr)
	}

	// remove from running transcodes
	sm.transcodesMutex.Lock()
	defer sm.transcodesMutex.Unlock()

	// only delete if is the same process
	if sm.runningTranscodes[hash] == p {
		delete(sm.runningTranscodes, hash)
	}
}

// TODO
func (sm *StreamManager) RemoveStaleFiles() {
	// check for the last time a stream was accessed
	// remove anything over a certain age
}
