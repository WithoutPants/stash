package sqlite

import (
	"database/sql"
	"fmt"
)

const fileTable = "files"

var countFilesForMissingChecksumQuery = `
SELECT id FROM files
WHERE files.checksum is null
`

var countFilesForMissingOSHashQuery = `
SELECT id FROM files
WHERE files.oshash is null
`

type fileQueryBuilder struct {
	repository
}

func NewFileReaderWriter(tx dbi) *fileQueryBuilder {
	return &fileQueryBuilder{
		repository{
			tx:        tx,
			tableName: fileTable,
			idColumn:  idColumn,
		},
	}
}

func (qb *fileQueryBuilder) Create(newFile models.File) (*models.File, error) {
	var ret models.File
	if err := qb.insertObject(newObject, &ret); err != nil {
		return nil, err
	}

	return &ret, nil
}

func (qb *fileQueryBuilder) Update(updatedObject models.FilePartial) (*modesl.File, error) {
	const partial = true
	if err := qb.update(updatedObject.ID, updatedObject, partial); err != nil {
		return nil, err
	}

	return qb.find(updatedObject.ID)
}

func (qb *fileQueryBuilder) UpdateFull(updatedFile models.File) (*models.File, error) {
	const partial = false
	if err := qb.update(updatedObject.ID, updatedObject, partial); err != nil {
		return nil, err
	}

	return qb.find(updatedObject.ID)
}

func (qb *fileQueryBuilder) UpdateModTime(id int, modTime models.NullSQLiteTimestamp) error {
	return qb.updateMap(id, map[string]interface{}{
		"file_mod_time": modTime,
	})
}

func (qb *fileQueryBuilder) Destroy(id int) error {
	return qb.destroyExisting([]int{id})
}

func (qb *fileQueryBuilder) Find(id int) (*models.File, error) {
	return qb.find(id)
}

func (qb *fileQueryBuilder) FindMany(ids []int) ([]*models.File, error) {
	var files []*File
	for _, id := range ids {
		file, err := qb.Find(id)
		if err != nil {
			return nil, err
		}

		if file == nil {
			return nil, fmt.Errorf("file with id %d not found", id)
		}

		files = append(files, file)
	}

	return files, nil
}

func (qb *fileQueryBuilder) find(id int) (*models.File, error) {
	var ret models.File
	if err := qb.get(id, &ret); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &ret, nil
}

func (qb *fileQueryBuilder) FindByChecksum(checksum string) (*models.File, error) {
	query := "SELECT * FROM files WHERE checksum = ? LIMIT 1"
	args := []interface{}{checksum}
	return qb.queryFile(query, args, nil)
}

func (qb *fileQueryBuilder) FindByOSHash(oshash string) (*models.File, error) {
	query := "SELECT * FROM files WHERE oshash = ? LIMIT 1"
	args := []interface{}{oshash}
	return qb.queryFile(query, args, nil)
}

func (qb *fileQueryBuilder) FindByPath(path string) (*models.File, error) {
	query := selectAll(fileTable) + "WHERE path = ? LIMIT 1"
	args := []interface{}{path}
	return qb.queryFile(query, args, nil)
}

func (qb *fileQueryBuilder) Count() (int, error) {
	return qb.runCountQuery(qb.buildCountQuery("SELECT files.id FROM files"), nil)
}

func (qb *fileQueryBuilder) Size() (uint64, error) {
	return qb.runSumQuery("SELECT SUM(size) as sum FROM files", nil)
}

// CountMissingChecksum returns the number of files missing a checksum value.
func (qb *fileQueryBuilder) CountMissingChecksum() (int, error) {
	return qb.runCountQuery(qb.buildCountQuery(countFilesForMissingChecksumQuery), []interface{}{})
}

// CountMissingOSHash returns the number of files missing an oshash value.
func (qb *fileQueryBuilder) CountMissingOSHash() (int, error) {
	return qb.runCountQuery(qb.buildCountQuery(countFilesForMissingOSHashQuery), []interface{}{})
}

func (qb *fileQueryBuilder) queryFile(query string, args []interface{}) (*models.File, error) {
	results, err := qb.queryFiles(query, args)
	if err != nil || len(results) < 1 {
		return nil, err
	}
	return results[0], nil
}

func (qb *fileQueryBuilder) queryFiles(query string, args []interface{}) ([]*models.File, error) {
	var ret models.Files
	if err := qb.query(query, args, &ret); err != nil {
		return nil, err
	}

	return []*models.File(ret), nil
}
