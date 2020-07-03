package plugin

import (
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/stashapp/stash/pkg/models"
	"gopkg.in/yaml.v2"
)

type PluginConfig struct {
	ID          string
	Name        string                   `yaml:"name"`
	Description *string                  `yaml:"description"`
	URL         *string                  `yaml:"url"`
	Version     *string                  `yaml:"version"`
	Tasks       []*PluginOperationConfig `yaml:"tasks"`
}

func (c PluginConfig) getPluginTasks() []*models.PluginTask {
	var ret []*models.PluginTask

	for _, o := range c.Tasks {
		ret = append(ret, &models.PluginTask{
			Name:        o.Name,
			Description: &o.Description,
			Plugin:      c.toPlugin(),
		})
	}

	return ret
}

func (c PluginConfig) getName() string {
	if c.Name != "" {
		return c.Name
	}

	return c.ID
}

func (c PluginConfig) toPlugin() *models.Plugin {
	return &models.Plugin{
		ID:          c.ID,
		Name:        c.getName(),
		Description: c.Description,
		URL:         c.URL,
		Version:     c.Version,
	}
}

func (c PluginConfig) getTask(name string) *PluginOperationConfig {
	for _, o := range c.Tasks {
		if o.Name == name {
			return o
		}
	}

	return nil
}

type InterfaceEnum string

const (
	// Uses the RPCRunner interface declared in common/rpc.go
	InterfaceEnumRPCV1 InterfaceEnum = "rpc.v1"

	// Treats stdout as raw output
	InterfaceEnumRaw InterfaceEnum = "raw"
)

func (i InterfaceEnum) Valid() bool {
	return i == InterfaceEnumRPCV1 || i == InterfaceEnumRaw
}

type PluginOperationConfig struct {
	Name        string   `yaml:"name"`
	Description string   `yaml:"description"`
	Exec        []string `yaml:"exec,flow"`

	// Argument fields
	DefaultArgs map[string]string `yaml:"defaultArgs"`

	// communication interface used when communicating with the spawned plugin process
	Interface InterfaceEnum `yaml:"interface"`
}

func loadPluginFromYAML(id string, reader io.Reader) (*PluginConfig, error) {
	ret := &PluginConfig{}

	parser := yaml.NewDecoder(reader)
	parser.SetStrict(true)
	err := parser.Decode(&ret)
	if err != nil {
		return nil, err
	}

	ret.ID = id

	return ret, nil
}

func loadPluginFromYAMLFile(path string) (*PluginConfig, error) {
	file, err := os.Open(path)
	defer file.Close()
	if err != nil {
		return nil, err
	}

	// set id to the filename
	id := filepath.Base(path)
	id = id[:strings.LastIndex(id, ".")]

	return loadPluginFromYAML(id, file)
}
