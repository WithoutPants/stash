package signedurl

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/url"
	"strconv"
	"time"
)

const (
	ExpiresParam = "expires"
	SigParam     = "signature"
	UserParam    = "user"
)

var (
	ErrInvalidSignature = errors.New("invalid signature")
	ErrInvalidURL       = errors.New("invalid URL")
	ErrExpiredURL       = errors.New("URL has expired")
)

func makeSignString(path string, expires time.Time, user string) string {
	qq := make(url.Values)
	qq.Set(ExpiresParam, strconv.FormatInt(expires.Unix(), 10))
	qq.Set(UserParam, user)
	return path + "?" + qq.Encode()
}

// SignURL signs a URL with an expiration time using HMAC-SHA256
func SignURL(rawURL string, secret []byte, user string, expires time.Time) (string, error) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return "", err
	}

	// Create the string to sign: path + ?expires=...
	signString := makeSignString(u.Path, expires, user)

	// Generate HMAC
	h := hmac.New(sha256.New, secret)
	h.Write([]byte(signString))
	signature := hex.EncodeToString(h.Sum(nil))

	// Add signature to query
	q := u.Query()
	q.Set(SigParam, signature)
	q.Set(ExpiresParam, strconv.FormatInt(expires.Unix(), 10))
	q.Set(UserParam, user)
	u.RawQuery = q.Encode()

	return u.String(), nil
}

func IsSignedURL(rawURL string) bool {
	u, err := url.Parse(rawURL)
	if err != nil {
		return false
	}

	q := u.Query()
	return q.Get(ExpiresParam) != "" && q.Get(SigParam) != "" && q.Get(UserParam) != ""
}

// VerifyURL verifies a signed URL, allowing for path suffixes (e.g., .mp4, .webm, /segment.ts)
// Returns the user if valid, or an error if invalid
func VerifyURL(rawURL string, secret []byte) (string, error) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return "", ErrInvalidURL
	}

	q := u.Query()
	expiresStr := q.Get(ExpiresParam)
	user := q.Get(UserParam)
	sig := q.Get(SigParam)

	if expiresStr == "" || sig == "" || user == "" {
		return "", ErrInvalidURL
	}

	expires, err := strconv.ParseInt(expiresStr, 10, 64)
	if err != nil {
		return "", ErrInvalidURL
	}

	if time.Now().Unix() > expires {
		return "", ErrExpiredURL
	}

	// Recreate the string to sign: path + ?expires=...
	signString := makeSignString(u.Path, time.Unix(expires, 0), user)

	// Verify HMAC
	h := hmac.New(sha256.New, secret)
	h.Write([]byte(signString))
	expectedSig := hex.EncodeToString(h.Sum(nil))

	if !hmac.Equal([]byte(sig), []byte(expectedSig)) {
		return "", ErrInvalidSignature
	}

	return user, nil
}
