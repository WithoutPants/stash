package ffmpeg

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/stashapp/stash/pkg/logger"
	"github.com/stashapp/stash/pkg/utils"
)

const hlsSegmentLength = 3.0

func WriteHLSPlaylist(probeResult VideoFile, baseUrl string, w io.Writer) {
	fmt.Fprint(w, "#EXTM3U\n")
	fmt.Fprint(w, "#EXT-X-VERSION:3\n")
	fmt.Fprint(w, "#EXT-X-MEDIA-SEQUENCE:0\n")
	fmt.Fprint(w, "#EXT-X-ALLOW-CACHE:YES\n")
	fmt.Fprintf(w, "#EXT-X-TARGETDURATION:%d\n", int(hlsSegmentLength))
	fmt.Fprint(w, "#EXT-X-PLAYLIST-TYPE:VOD\n")

	duration := probeResult.Duration

	leftover := duration
	upTo := 0.0

	i := strings.LastIndex(baseUrl, ".m3u8")
	tsURL := baseUrl[0:i] + ".ts"

	for leftover > 0 {
		thisLength := hlsSegmentLength
		if leftover < thisLength {
			thisLength = leftover
		}

		fmt.Fprintf(w, "#EXTINF: %f,\n", thisLength)
		fmt.Fprintf(w, "%s?start=%f\n", tsURL, upTo)

		leftover -= thisLength
		upTo += thisLength
	}

	fmt.Fprint(w, "#EXT-X-ENDLIST\n")
}

var (
	hlsMutex = sync.RWMutex{}
)

type HLSStreamer struct {
	Encoder   Encoder
	CacheDir  string
	Hash      string
	VideoFile *VideoFile
	Start     float64
}

func (s *HLSStreamer) Serve(w http.ResponseWriter, r *http.Request) {
	segmentNumber := int(s.Start / hlsSegmentLength)

	// determine segment filename
	segmentsDir := filepath.Join(s.CacheDir, s.Hash)
	segmentFilename := filepath.Join(segmentsDir, fmt.Sprintf("%d.ts", segmentNumber))

	if exists, _ := utils.FileExists(segmentFilename); exists {
		http.ServeFile(w, r, segmentFilename)
		return
	}

	// start transcoding process if its not already started
	if err := s.startTranscode(); err != nil {
		logger.Errorf("error transcoding for HLS stream: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// TODO - assume process is running - wait for the file to be generated
	time.Sleep(time.Millisecond * 100)

	if exists, _ := utils.FileExists(segmentFilename); !exists {
		http.Error(w, "ts file not generated", http.StatusInternalServerError)
		return
	}
	http.ServeFile(w, r, segmentFilename)
}

func (s *HLSStreamer) startTranscode() error {
	hlsMutex.Lock()
	defer hlsMutex.Unlock()

	segmentsDir := filepath.Join(s.CacheDir, s.Hash)
	if exists, _ := utils.DirExists(segmentsDir); !exists {
		if err := os.Mkdir(segmentsDir, 0755); err != nil {
			return err
		}

		go s.Encoder.TranscodeHLS(*s.VideoFile, TranscodeOptions{
			OutputPath: segmentsDir,
		})
	}

	return nil
}
