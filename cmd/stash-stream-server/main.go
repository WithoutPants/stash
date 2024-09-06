package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"

	"github.com/go-chi/cors"
	"github.com/stashapp/stash/pkg/ffmpeg"
	"github.com/stashapp/stash/pkg/fsutil"
	"github.com/stashapp/stash/pkg/logger"
	"github.com/stashapp/stash/pkg/models"
)

var encoder *ffmpeg.FFMpeg
var ffprobe ffmpeg.FFProbe
var streamManager *ffmpeg.StreamManager

func openLogFile(fn string) (*os.File, error) {
	return os.OpenFile(fn, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
}

type streamConfigType struct {
	maxStreamingTranscodeSize     models.StreamingResolutionEnum
	liveTranscodeInputArgs        []string
	liveTranscodeOutputArgs       []string
	transcodeHardwareAcceleration bool
}

func (c streamConfigType) GetMaxStreamingTranscodeSize() models.StreamingResolutionEnum {
	return models.StreamingResolutionEnumOriginal
}
func (c streamConfigType) GetLiveTranscodeInputArgs() []string {
	return c.liveTranscodeInputArgs
}
func (c streamConfigType) GetLiveTranscodeOutputArgs() []string {
	return c.liveTranscodeOutputArgs
}
func (c streamConfigType) GetTranscodeHardwareAcceleration() bool {
	return c.transcodeHardwareAcceleration
}

var streamConfig = streamConfigType{
	// TODO - this should be configurable. We could get these from the server,
	// but that would require a call to the server to get the user's settings,
	// and to keep them in sync (or check the settings on every request which is
	// not ideal)
	maxStreamingTranscodeSize: models.StreamingResolutionEnumOriginal,
	liveTranscodeInputArgs:    nil,
	liveTranscodeOutputArgs:   nil,
	// TODO - add this to the config
	transcodeHardwareAcceleration: false,
}

func main() {
	c, err := loadConfig()
	if err != nil {
		panic(err)
	}

	// TODO - logging should just use the internal/log package
	if c.LogFile != "" {
		f, err := openLogFile(c.LogFile)
		if err != nil {
			panic(err)
		}

		defer f.Close()
		log.SetOutput(f)
	}

	logger.Logger = &logger.BasicLogger{}

	if err := ffmpeg.ValidateFFMpeg(c.FFmpegPath); err != nil {
		log.Fatalf("Invalid ffmpeg path: %v", err)
	}

	lockManager := fsutil.NewReadLockManager()

	encoder = ffmpeg.NewEncoder(c.FFmpegPath)
	encoder.InitHWSupport(context.Background())

	ffprobe = ffmpeg.FFProbe(c.FFprobePath)
	streamManager = ffmpeg.NewStreamManager("cache", encoder, ffprobe, streamConfig, lockManager)

	address := c.Host + ":" + strconv.Itoa(c.Port)

	http.Handle("/", handleRequestAndRedirect(c))
	go func() {
		fmt.Printf("Running stash stream server on %s\n", address)
		err := http.ListenAndServe(address, nil)
		if err != nil {
			log.Println(err.Error())
		}
	}()

	// just block forever
	select {}
}

var streamRE = regexp.MustCompile(`\/stream\..+`)

// Given a request send it to the appropriate url
func handleRequestAndRedirect(c *config) http.Handler {
	h := cors.AllowAll().Handler
	return h(http.HandlerFunc(func(res http.ResponseWriter, req *http.Request) {
		// TODO - handle /version - return the version of the server

		// /stream handler
		if streamRE.MatchString(req.URL.Path) {
			localStream(c, res, req)
			return
		}

		// TODO - return 404
	}))
}

func localStream(c *config, res http.ResponseWriter, req *http.Request) {
	var streamType = ffmpeg.StreamTypeMP4

	if strings.HasSuffix(req.URL.Path, "/stream.mp4") {
		streamType = ffmpeg.StreamTypeMP4
	} else if strings.HasSuffix(req.URL.Path, "/stream.webm") {
		streamType = ffmpeg.StreamTypeWEBM
	} else {
		// TODO - handle other types

		// TODO - this could be direct stream, which we should either not handle
		// (and expect the UI to do this)
		// or redirect
		// for now, just assume mp4
	}

	query := req.URL.Query()

	origin := query.Get("origin")
	query.Del("origin")

	resolution := query.Get("resolution")
	query.Del("resolution")

	start := query.Get("start")
	query.Del("start")

	req.URL.RawQuery = query.Encode()

	remoteURL, _ := url.Parse(origin)
	req.URL.Scheme = remoteURL.Scheme
	req.URL.Host = remoteURL.Host // Host includes the port

	startTime, _ := strconv.ParseFloat(start, 64)

	streamManager.ServeTranscode(res, req, ffmpeg.TranscodeOptions{
		VideoFile: &models.VideoFile{
			BaseFile: &models.BaseFile{
				Path: req.URL.String(),
			},
			AudioCodec: string(ffmpeg.Aac), // just to ensure it doesn't strip out the audio
		},
		StartTime:  startTime,
		StreamType: streamType,
		Resolution: resolution,
	})
}
