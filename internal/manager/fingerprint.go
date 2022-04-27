package manager

import (
	"errors"
	"fmt"
	"io"

	"github.com/stashapp/stash/internal/manager/config"
	"github.com/stashapp/stash/pkg/file"
	"github.com/stashapp/stash/pkg/hash/md5"
	"github.com/stashapp/stash/pkg/hash/oshash"
)

type fingerprintCalculator struct {
	Config *config.Instance
}

func (c *fingerprintCalculator) calculateOshash(f *file.BaseFile, o file.Opener) (*file.Fingerprint, error) {
	r, err := o.Open()
	if err != nil {
		return nil, fmt.Errorf("opening file: %w", err)
	}

	defer r.Close()

	rc, isRC := r.(io.ReadSeeker)
	if !isRC {
		return nil, errors.New("cannot calculate oshash for non-readcloser")
	}

	// calculate oshash first
	hash, err := oshash.FromReader(rc, f.Size)
	if err != nil {
		return nil, fmt.Errorf("calculating oshash: %w", err)
	}

	return &file.Fingerprint{
		Type:        file.FingerprintTypeOshash,
		Fingerprint: hash,
	}, nil
}

func (c *fingerprintCalculator) calculateMD5(o file.Opener) (*file.Fingerprint, error) {
	r, err := o.Open()
	if err != nil {
		return nil, fmt.Errorf("opening file: %w", err)
	}

	defer r.Close()

	// calculate oshash first
	hash, err := md5.FromReader(r)
	if err != nil {
		return nil, fmt.Errorf("calculating oshash: %w", err)
	}

	return &file.Fingerprint{
		Type:        file.FingerprintTypeMD5,
		Fingerprint: hash,
	}, nil
}

func (c *fingerprintCalculator) CalculateFingerprints(f *file.BaseFile, o file.Opener) ([]file.Fingerprint, error) {
	var ret []file.Fingerprint
	calculateMD5 := true

	if isVideo(f.Basename) {
		// calculate oshash first
		fp, err := c.calculateOshash(f, o)
		if err != nil {
			return nil, err
		}

		ret = append(ret, *fp)

		// only calculate MD5 if enabled in config
		calculateMD5 = c.Config.IsCalculateMD5()
	}

	if calculateMD5 {
		fp, err := c.calculateMD5(o)
		if err != nil {
			return nil, err
		}

		ret = append(ret, *fp)
	}

	return ret, nil
}
