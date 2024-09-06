package main

import (
	"os"

	"gopkg.in/yaml.v2"
)

type config struct {
	Host        string `yaml:"host"`
	Port        int    `yaml:"port"`
	FFmpegPath  string `yaml:"ffmpeg_path"`
	FFprobePath string `yaml:"ffprobe_path"`
	LogFile     string `yaml:"log_file"`
	LogDebug    bool   `yaml:"log_debug"`
}

func loadConfig() (*config, error) {
	file, err := os.Open("config.yml")
	if err != nil {
		return nil, err
	}
	defer file.Close()

	ret := &config{}

	parser := yaml.NewDecoder(file)
	parser.SetStrict(true)
	err = parser.Decode(&ret)
	if err != nil {
		return nil, err
	}

	return ret, nil
}
