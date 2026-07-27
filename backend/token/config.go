package token

import (
	"errors"
	"fmt"
	"time"
)

type Config struct {
	AccessTokenSecret  []byte
	RefreshTokenSecret []byte
	AccessTokenTTL     time.Duration
	RefreshTokenTTL    time.Duration
	Issuer             string
}

var ErrTokenRefused = errors.New("token: refused")

var (
	ErrInvalidToken     = fmt.Errorf("%w: %w", ErrTokenRefused, errors.New("invalid token"))
	ErrExpiredToken     = fmt.Errorf("%w: %w", ErrTokenRefused, errors.New("expired token"))
	ErrInvalidClaims    = fmt.Errorf("%w: %w", ErrTokenRefused, errors.New("invalid claims"))
	ErrTokenRevoked     = fmt.Errorf("%w: %w", ErrTokenRefused, errors.New("revoked token"))
	ErrInvalidTokenType = fmt.Errorf("%w: %w", ErrTokenRefused, errors.New("invalid type"))
)

func GenerateConfig(accessSecret, refreshSecret []byte) Config {
	return Config{
		AccessTokenSecret:  accessSecret,
		RefreshTokenSecret: refreshSecret,
		AccessTokenTTL:     15 * time.Minute,
		RefreshTokenTTL:    31 * 24 * time.Hour,
		Issuer:             "autora-backend",
	}
}
