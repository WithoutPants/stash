// +build ignore

package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"os"
	"strings"

	"github.com/stashapp/stash/pkg/models"
	"github.com/stashapp/stash/pkg/scraper"
	"github.com/stretchr/testify/assert"
	"gopkg.in/yaml.v2"
)

type testConfig struct {
	URL       string                   `yaml:"url"`
	Performer *models.ScrapedPerformer `yaml:"performer"`
	Scene     *models.ScrapedScene     `yaml:"scene"`
}

func (c testConfig) doTest(scraperConfig scraper.ScraperConfig) (bool, error) {
	if c.Performer != nil {
		return c.doScrapePerformerTest(scraperConfig)
	}
	if c.Scene != nil {
		return c.doScrapeSceneTest(scraperConfig)
	}

	return false, errors.New("Missing performer or scene")
}

func (c testConfig) doScrapePerformerTest(scraperConfig scraper.ScraperConfig) (bool, error) {
	scrapedPerformer, err := scraperConfig.ScrapePerformerURL(c.URL)
	result := true

	if err != nil {
		return false, err
	}

	// convert result into map
	j, _ := json.Marshal(scrapedPerformer)
	performerMap := make(map[string]interface{})
	json.Unmarshal(j, &performerMap)

	// convert expected into map
	j, _ = json.Marshal(*c.Performer)
	expectedMap := make(map[string]interface{})
	json.Unmarshal(j, &expectedMap)

	for k, v := range expectedMap {
		if v != nil {
			if !assert.ObjectsAreEqualValues(v, performerMap[k]) {
				fmt.Printf("%s: expected [%s] got [%s]\n", k, v, performerMap[k])
				result = false
			}
		}
	}

	return result, nil
}

func (c testConfig) doScrapeSceneTest(scraperConfig scraper.ScraperConfig) (bool, error) {
	scrapedScene, err := scraperConfig.ScrapeSceneURL(c.URL)
	result := true

	if err != nil {
		return false, err
	}

	// convert result into map
	j, _ := json.Marshal(scrapedScene)
	sceneMap := make(map[string]interface{})
	json.Unmarshal(j, &sceneMap)

	// convert expected into map
	j, _ = json.Marshal(*c.Scene)
	expectedMap := make(map[string]interface{})
	json.Unmarshal(j, &expectedMap)

	for k, v := range expectedMap {
		if !assert.ObjectsAreEqualValues(v, sceneMap[k]) {
			fmt.Printf("%s: expected [%s] got [%s]\n", k, v, sceneMap[k])
			result = false
		}
	}

	return result, nil
}

type testsConfig struct {
	Tests []testConfig `yaml:"tests"`
}

func (c testsConfig) Test(scraperConfig scraper.ScraperConfig) {
	for _, v := range c.Tests {
		fmt.Printf("Running test against URL: %s\n", v.URL)
		r, err := v.doTest(scraperConfig)
		if err != nil {
			fmt.Printf("Error: %s\n", err.Error())
		} else {
			if r {
				fmt.Printf("URL [%s]: Success!\n", v.URL)
			} else {
				fmt.Printf("URL [%s]: Failed!\n", v.URL)
			}
		}
	}
}

func main() {
	scraperYML := os.Args[1]

	scraperConfig, config, err := openScraper(scraperYML)
	if err != nil {
		fmt.Printf("error loading scraper: %s", err.Error())
		return
	}

	config.Test(*scraperConfig)
}

func openScraper(path string) (*scraper.ScraperConfig, *testsConfig, error) {
	file, err := os.Open(path)
	defer file.Close()
	if err != nil {
		return nil, nil, err
	}

	fileContents, err := ioutil.ReadAll(file)
	if err != nil {
		return nil, nil, err
	}

	config, err := buildTestConfig(string(fileContents))
	if err != nil {
		return nil, nil, err
	}

	scraperConfig, err := scraper.LoadScraperFromYAML("Test", strings.NewReader(string(fileContents)))
	if err != nil {
		return nil, nil, err
	}

	return scraperConfig, config, nil
}

func buildTestConfig(scraperYML string) (*testsConfig, error) {
	lines := strings.Split(scraperYML, "\n")

	// find the line starting with # Tests:
	testYML := strings.Builder{}
	found := false

	for _, l := range lines {
		if strings.HasPrefix(l, "# tests:") {
			found = true
		}

		if found {
			// strip the # prefix
			testYML.WriteString(strings.TrimPrefix(l, "# ") + "\n")
		}
	}

	if testYML.Len() == 0 {
		return nil, nil
	}

	ret := &testsConfig{}
	parser := yaml.NewDecoder(strings.NewReader(testYML.String()))
	parser.SetStrict(true)
	err := parser.Decode(&ret)
	if err != nil {
		return nil, err
	}

	return ret, nil
}
