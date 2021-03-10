// +build integration

package manager

import (
	"context"
	"database/sql"
	"fmt"
	"io/ioutil"
	"os"
	"strings"
	"sync"
	"testing"

	"github.com/stashapp/stash/pkg/database"
	"github.com/stashapp/stash/pkg/models"
	"github.com/stashapp/stash/pkg/sqlite"
	"github.com/stashapp/stash/pkg/utils"

	_ "github.com/golang-migrate/migrate/v4/database/sqlite3"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

const testName = "Foo's Bar"
const testExtension = ".mp4"
const existingStudioName = "ExistingStudio"

const existingStudioSceneName = testName + ".dontChangeStudio" + testExtension

var existingStudioID int

var testSeparators = []string{
	".",
	"-",
	"_",
	" ",
}

var testEndSeparators = []string{
	"{",
	"}",
	"(",
	")",
	",",
}

func generateNamePatterns(name, separator string) []string {
	var ret []string
	ret = append(ret, fmt.Sprintf("%s%saaa"+testExtension, name, separator))
	ret = append(ret, fmt.Sprintf("aaa%s%s"+testExtension, separator, name))
	ret = append(ret, fmt.Sprintf("aaa%s%s%sbbb"+testExtension, separator, name, separator))
	ret = append(ret, fmt.Sprintf("dir/%s%saaa"+testExtension, name, separator))
	ret = append(ret, fmt.Sprintf("dir\\%s%saaa"+testExtension, name, separator))
	ret = append(ret, fmt.Sprintf("%s%saaa/dir/bbb"+testExtension, name, separator))
	ret = append(ret, fmt.Sprintf("%s%saaa\\dir\\bbb"+testExtension, name, separator))
	ret = append(ret, fmt.Sprintf("dir/%s%s/aaa"+testExtension, name, separator))
	ret = append(ret, fmt.Sprintf("dir\\%s%s\\aaa"+testExtension, name, separator))

	return ret
}

func generateFalseNamePattern(name string, separator string) string {
	splitted := strings.Split(name, " ")

	return fmt.Sprintf("%s%saaa%s%s"+testExtension, splitted[0], separator, separator, splitted[1])
}

func testTeardown(databaseFile string) {
	err := database.DB.Close()

	if err != nil {
		panic(err)
	}

	err = os.Remove(databaseFile)
	if err != nil {
		panic(err)
	}
}

func runTests(m *testing.M) int {
	// create the database file
	f, err := ioutil.TempFile("", "*.sqlite")
	if err != nil {
		panic(fmt.Sprintf("Could not create temporary file: %s", err.Error()))
	}

	f.Close()
	databaseFile := f.Name()
	database.Initialize(databaseFile)

	// defer close and delete the database
	defer testTeardown(databaseFile)

	err = populateDB()
	if err != nil {
		panic(fmt.Sprintf("Could not populate database: %s", err.Error()))
	} else {
		// run the tests
		return m.Run()
	}
}

func TestMain(m *testing.M) {
	ret := runTests(m)
	os.Exit(ret)
}

func createPerformer(pqb models.PerformerWriter) error {
	// create the performer
	performer := models.Performer{
		Checksum: testName,
		Name:     sql.NullString{Valid: true, String: testName},
		Favorite: sql.NullBool{Valid: true, Bool: false},
	}

	_, err := pqb.Create(performer)
	if err != nil {
		return err
	}

	return nil
}

func createStudio(qb models.StudioWriter, name string) (*models.Studio, error) {
	// create the studio
	studio := models.Studio{
		Checksum: name,
		Name:     sql.NullString{Valid: true, String: testName},
	}

	return qb.Create(studio)
}

func createTag(qb models.TagWriter) error {
	// create the studio
	tag := models.Tag{
		Name: testName,
	}

	_, err := qb.Create(tag)
	if err != nil {
		return err
	}

	return nil
}

func getFilenamePatterns() []string {
	var patterns []string

	separators := append(testSeparators, testEndSeparators...)

	for _, separator := range separators {
		patterns = append(patterns, generateNamePatterns(testName, separator)...)
		patterns = append(patterns, generateNamePatterns(strings.ToLower(testName), separator)...)
	}

	// add test cases for intra-name separators
	for _, separator := range testSeparators {
		if separator != " " {
			patterns = append(patterns, generateNamePatterns(strings.Replace(testName, " ", separator, -1), separator)...)
		}
	}

	return patterns
}

func getFalseFilenamePatterns() []string {
	var patterns []string

	separators := append(testSeparators, testEndSeparators...)

	for _, separator := range separators {
		patterns = append(patterns, generateFalseNamePattern(testName, separator))
	}

	return patterns
}

func createScenes(sqb models.SceneReaderWriter) error {
	// create the scenes
	scenePatterns := getFilenamePatterns()
	falseScenePatterns := getFalseFilenamePatterns()

	for _, fn := range scenePatterns {
		err := createScene(sqb, makeScene(fn, true))
		if err != nil {
			return err
		}
	}
	for _, fn := range falseScenePatterns {
		err := createScene(sqb, makeScene(fn, false))
		if err != nil {
			return err
		}
	}

	// add organized scenes
	for _, fn := range scenePatterns {
		s := makeScene("organized"+fn, false)
		s.Organized = true
		err := createScene(sqb, s)
		if err != nil {
			return err
		}
	}

	// create scene with existing studio io
	studioScene := makeScene(existingStudioSceneName, true)
	studioScene.StudioID = sql.NullInt64{Valid: true, Int64: int64(existingStudioID)}
	err := createScene(sqb, studioScene)
	if err != nil {
		return err
	}

	return nil
}

func makeScene(name string, expectedResult bool) *models.Scene {
	scene := &models.Scene{
		Checksum: sql.NullString{String: utils.MD5FromString(name), Valid: true},
		Path:     name,
	}

	// if expectedResult is true then we expect it to match, set the title accordingly
	if expectedResult {
		scene.Title = sql.NullString{Valid: true, String: name}
	}

	return scene
}

func createScene(sqb models.SceneWriter, scene *models.Scene) error {
	_, err := sqb.Create(*scene)

	if err != nil {
		return fmt.Errorf("Failed to create scene with name '%s': %s", scene.Path, err.Error())
	}

	return nil
}

func createImages(sqb models.ImageReaderWriter) error {
	// create the images
	imagePatterns := getFilenamePatterns()
	falseImagePatterns := getFalseFilenamePatterns()

	for _, fn := range imagePatterns {
		err := createImage(sqb, makeImage(fn, true))
		if err != nil {
			return err
		}
	}
	for _, fn := range falseImagePatterns {
		err := createImage(sqb, makeImage(fn, false))
		if err != nil {
			return err
		}
	}

	// add organized image
	for _, fn := range imagePatterns {
		s := makeImage("organized"+fn, false)
		s.Organized = true
		err := createImage(sqb, s)
		if err != nil {
			return err
		}
	}

	// create image with existing studio io
	studioImage := makeImage(existingStudioSceneName, true)
	studioImage.StudioID = sql.NullInt64{Valid: true, Int64: int64(existingStudioID)}
	err := createImage(sqb, studioImage)
	if err != nil {
		return err
	}

	return nil
}

func makeImage(name string, expectedResult bool) *models.Image {
	image := &models.Image{
		Checksum: utils.MD5FromString(name),
		Path:     name,
	}

	// if expectedResult is true then we expect it to match, set the title accordingly
	if expectedResult {
		image.Title = sql.NullString{Valid: true, String: name}
	}

	return image
}

func createImage(sqb models.ImageWriter, image *models.Image) error {
	_, err := sqb.Create(*image)

	if err != nil {
		return fmt.Errorf("Failed to create image with name '%s': %s", image.Path, err.Error())
	}

	return nil
}

func withTxn(f func(r models.Repository) error) error {
	t := sqlite.NewTransactionManager()
	return t.WithTxn(context.TODO(), f)
}

func populateDB() error {
	if err := withTxn(func(r models.Repository) error {
		if err := createPerformer(r.Performer()); err != nil {
			return err
		}

		if _, err := createStudio(r.Studio(), testName); err != nil {
			return err
		}

		// create existing studio
		existingStudio, err := createStudio(r.Studio(), existingStudioName)
		if err != nil {
			return err
		}

		existingStudioID = existingStudio.ID

		if err := createTag(r.Tag()); err != nil {
			return err
		}

		if err := createScenes(r.Scene()); err != nil {
			return err
		}

		if err := createImages(r.Image()); err != nil {
			return err
		}

		return nil
	}); err != nil {
		return err
	}

	return nil
}

func TestParsePerformers(t *testing.T) {
	var performers []*models.Performer
	if err := withTxn(func(r models.Repository) error {
		var err error
		performers, err = r.Performer().All()
		return err
	}); err != nil {
		t.Errorf("Error getting performer: %s", err)
		return
	}

	task := AutoTagPerformerTask{
		AutoTagTask: AutoTagTask{
			txnManager: sqlite.NewTransactionManager(),
		},
		performer: performers[0],
	}

	var wg sync.WaitGroup
	wg.Add(1)
	task.Start(&wg)

	// verify that scenes were tagged correctly
	withTxn(func(r models.Repository) error {
		pqb := r.Performer()

		scenes, err := r.Scene().All()
		if err != nil {
			t.Error(err.Error())
		}

		for _, scene := range scenes {
			performers, err := pqb.FindBySceneID(scene.ID)

			if err != nil {
				t.Errorf("Error getting scene performers: %s", err.Error())
			}

			// title is only set on scenes where we expect performer to be set
			if scene.Title.String == scene.Path && len(performers) == 0 {
				t.Errorf("Did not set performer '%s' for path '%s'", testName, scene.Path)
			} else if scene.Title.String != scene.Path && len(performers) > 0 {
				t.Errorf("Incorrectly set performer '%s' for path '%s'", testName, scene.Path)
			}
		}

		images, err := r.Image().All()
		if err != nil {
			t.Error(err.Error())
		}

		for _, image := range images {
			performers, err := pqb.FindByImageID(image.ID)

			if err != nil {
				t.Errorf("Error getting image performers: %s", err.Error())
			}

			// title is only set on images where we expect performer to be set
			if image.Title.String == image.Path && len(performers) == 0 {
				t.Errorf("Did not set performer '%s' for path '%s'", testName, image.Path)
			} else if image.Title.String != image.Path && len(performers) > 0 {
				t.Errorf("Incorrectly set performer '%s' for path '%s'", testName, image.Path)
			}
		}

		return nil
	})
}

func TestParseStudios(t *testing.T) {
	var studios []*models.Studio
	if err := withTxn(func(r models.Repository) error {
		var err error
		studios, err = r.Studio().All()
		return err
	}); err != nil {
		t.Errorf("Error getting studio: %s", err)
		return
	}

	task := AutoTagStudioTask{
		AutoTagTask: AutoTagTask{
			txnManager: sqlite.NewTransactionManager(),
		},
		studio: studios[0],
	}

	var wg sync.WaitGroup
	wg.Add(1)
	task.Start(&wg)

	// verify that scenes were tagged correctly
	withTxn(func(r models.Repository) error {
		scenes, err := r.Scene().All()
		if err != nil {
			t.Error(err.Error())
		}

		for _, scene := range scenes {
			// check for existing studio id scene first
			if scene.Path == existingStudioSceneName {
				if scene.StudioID.Int64 != int64(existingStudioID) {
					t.Error("Incorrectly overwrote studio ID for scene with existing studio ID")
				}
			} else {
				// title is only set on scenes where we expect studio to be set
				if scene.Title.String == scene.Path && scene.StudioID.Int64 != int64(studios[0].ID) {
					t.Errorf("Did not set studio '%s' for path '%s'", testName, scene.Path)
				} else if scene.Title.String != scene.Path && scene.StudioID.Int64 == int64(studios[0].ID) {
					t.Errorf("Incorrectly set studio '%s' for path '%s'", testName, scene.Path)
				}
			}
		}

		images, err := r.Image().All()
		if err != nil {
			t.Error(err.Error())
		}

		for _, image := range images {
			// check for existing studio id image first
			if image.Path == existingStudioSceneName {
				if image.StudioID.Int64 != int64(existingStudioID) {
					t.Error("Incorrectly overwrote studio ID for image with existing studio ID")
				}
			} else {
				// title is only set on images where we expect studio to be set
				if image.Title.String == image.Path && image.StudioID.Int64 != int64(studios[0].ID) {
					t.Errorf("Did not set studio '%s' for path '%s'", testName, image.Path)
				} else if image.Title.String != image.Path && image.StudioID.Int64 == int64(studios[0].ID) {
					t.Errorf("Incorrectly set studio '%s' for path '%s'", testName, image.Path)
				}
			}
		}

		return nil
	})
}

func TestParseTags(t *testing.T) {
	var tags []*models.Tag
	if err := withTxn(func(r models.Repository) error {
		var err error
		tags, err = r.Tag().All()
		return err
	}); err != nil {
		t.Errorf("Error getting performer: %s", err)
		return
	}

	task := AutoTagTagTask{
		AutoTagTask: AutoTagTask{
			txnManager: sqlite.NewTransactionManager(),
		},
		tag: tags[0],
	}

	var wg sync.WaitGroup
	wg.Add(1)
	task.Start(&wg)

	// verify that scenes were tagged correctly
	withTxn(func(r models.Repository) error {
		scenes, err := r.Scene().All()
		if err != nil {
			t.Error(err.Error())
		}

		tqb := r.Tag()

		for _, scene := range scenes {
			tags, err := tqb.FindBySceneID(scene.ID)

			if err != nil {
				t.Errorf("Error getting scene tags: %s", err.Error())
			}

			// title is only set on scenes where we expect performer to be set
			if scene.Title.String == scene.Path && len(tags) == 0 {
				t.Errorf("Did not set tag '%s' for path '%s'", testName, scene.Path)
			} else if scene.Title.String != scene.Path && len(tags) > 0 {
				t.Errorf("Incorrectly set tag '%s' for path '%s'", testName, scene.Path)
			}
		}

		images, err := r.Image().All()
		if err != nil {
			t.Error(err.Error())
		}

		for _, image := range images {
			tags, err := tqb.FindByImageID(image.ID)

			if err != nil {
				t.Errorf("Error getting image tags: %s", err.Error())
			}

			// title is only set on images where we expect performer to be set
			if image.Title.String == image.Path && len(tags) == 0 {
				t.Errorf("Did not set tag '%s' for path '%s'", testName, image.Path)
			} else if image.Title.String != image.Path && len(tags) > 0 {
				t.Errorf("Incorrectly set tag '%s' for path '%s'", testName, image.Path)
			}
		}

		return nil
	})
}
