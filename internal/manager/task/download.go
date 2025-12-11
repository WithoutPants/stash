package task

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"

	"github.com/stashapp/stash/pkg/job"
	"github.com/stashapp/stash/pkg/logger"
)

type DownloadJob struct {
	DestinationDirectory string
	OnComplete           func(ctx context.Context)
	URL                  string
	DownloadedPath       string
	// TODO - accept and validate checksum
	downloaded int
}

func (s *DownloadJob) Execute(ctx context.Context, progress *job.Progress) error {
	if err := s.download(ctx, progress); err != nil {
		if job.IsCancelled(ctx) {
			return nil
		}
		return err
	}

	if s.OnComplete != nil {
		s.OnComplete(ctx)
	}

	return nil
}

func (s *DownloadJob) download(ctx context.Context, progress *job.Progress) error {
	err := s.downloadSingle(ctx, s.URL, progress)
	if err != nil {
		return err
	}

	return nil
}

type setPercenter interface {
	SetPercent(percent float64)
}

type downloadProgressReader struct {
	io.Reader
	progress  setPercenter
	bytesRead int64
	total     int64
}

func (r *downloadProgressReader) Read(p []byte) (int, error) {
	read, err := r.Reader.Read(p)
	if err == nil {
		r.bytesRead += int64(read)
		if r.total > 0 {
			progress := float64(r.bytesRead) / float64(r.total)
			r.progress.SetPercent(progress)
		}
	}

	return read, err
}

func (s *DownloadJob) downloadSingle(ctx context.Context, url string, progress *job.Progress) error {
	if url == "" {
		return fmt.Errorf("no url provided")
	}

	destDir := s.DestinationDirectory

	// Configure where we want to download the archive
	urlBase := path.Base(url)
	destPath := filepath.Join(destDir, urlBase)

	_ = os.Remove(destPath) // remove archive if it already exists
	out, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer out.Close()

	logger.Infof("Downloading %s...", url)

	progress.ExecuteTask(fmt.Sprintf("Downloading %s", url), func() {
		err = s.downloadFile(ctx, url, out, progress)
	})

	if err != nil {
		return fmt.Errorf("failed to download from %s: %w", url, err)
	}

	s.DownloadedPath = destPath

	logger.Info("Downloading complete")

	return nil
}

func (s *DownloadJob) downloadFile(ctx context.Context, url string, out *os.File, progress *job.Progress) error {
	// Make the HTTP request
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}

	transport := &http.Transport{Proxy: http.ProxyFromEnvironment}

	client := &http.Client{
		Transport: transport,
	}

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Check server response
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status: %s", resp.Status)
	}

	reader := &downloadProgressReader{
		Reader:   resp.Body,
		total:    resp.ContentLength,
		progress: progress,
	}

	// Write the response to the archive file location
	if _, err := io.Copy(out, reader); err != nil {
		return err
	}

	// mime := resp.Header.Get("Content-Type")
	// if mime != "application/zip" { // try detecting MIME type since some servers don't return the correct one
	// 	data := make([]byte, 500) // http.DetectContentType only reads up to 500 bytes
	// 	_, _ = out.ReadAt(data, 0)
	// 	mime = http.DetectContentType(data)
	// }

	// if mime != "application/zip" {
	// 	return fmt.Errorf("downloaded file is not a zip archive")
	// }

	return nil
}
