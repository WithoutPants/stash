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

var streamRE = regexp.MustCompile(`\/stream\..+`)
var encoder *ffmpeg.FFMpeg
var ffprobe ffmpeg.FFProbe
var streamManager *ffmpeg.StreamManager

func openLogFile(fn string) (*os.File, error) {
	return os.OpenFile("log.txt", os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
}

type streamConfigType struct {
	loaded                        bool
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
	maxStreamingTranscodeSize:     models.StreamingResolutionEnumOriginal,
	liveTranscodeInputArgs:        nil,
	liveTranscodeOutputArgs:       nil,
	transcodeHardwareAcceleration: false,
}

func main() {
	c, err := loadConfig()
	if err != nil {
		panic(err)
	}

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

// Given a request send it to the appropriate url
func handleRequestAndRedirect(c *config) http.Handler {
	h := cors.AllowAll().Handler
	return h(http.HandlerFunc(func(res http.ResponseWriter, req *http.Request) {
		if !streamConfig.loaded {
			// apikey := res.Header().Get("ApiKey")
			// TODO request the config from the server
		}

		// TODO - test endpoint

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
		// TODO - this could be direct stream, which we should either not handle
		// (and expect the UI to do this)
		// or redirect
		// for now, just assume mp4
	}

	req.URL.Path = streamRE.ReplaceAllString(req.URL.Path, "/stream")

	query := req.URL.Query()

	resolution := req.Form.Get("resolution")
	query.Del("resolution")

	start := query.Get("start")
	query.Del("start")

	req.URL.RawQuery = query.Encode()

	remoteURL, _ := url.Parse(c.ServerURL)
	req.URL.Scheme = remoteURL.Scheme
	req.URL.Host = remoteURL.Host

	startTime, _ := strconv.ParseFloat(start, 64)

	streamManager.ServeTranscode(res, req, ffmpeg.TranscodeOptions{
		VideoFile: &models.VideoFile{
			// TODO actually get this info
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
