package api

import (
	"io/ioutil"
	"math/rand"
	"net/http"
	"strings"

	"github.com/markbates/pkger"
)

func getRandomPerformerImage(gender string) ([]byte, error) {
	var path string
	var dir http.File
	var err error

	performerImageDir := pkger.Include("/static/performer")
	malePerformerImageDir := pkger.Include("/static/performer_male")

	switch strings.ToUpper(gender) {
	case "FEMALE":
		path = performerImageDir
	case "MALE":
		path = malePerformerImageDir
	default:
		path = performerImageDir
	}

	dir, err = pkger.Open(path)
	if err != nil {
		return nil, err
	}
	defer dir.Close()

	imageFiles, err := dir.Readdir(0)
	if err != nil {
		return nil, err
	}

	index := rand.Intn(len(imageFiles))
	f, err := pkger.Open(path + "/" + imageFiles[index].Name())
	if err != nil {
		return nil, err
	}
	defer f.Close()

	return ioutil.ReadAll(f)
}
