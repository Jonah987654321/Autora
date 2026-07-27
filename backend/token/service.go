package token

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type JWTService struct {
	config     Config
	tokenStore TokenStore
}

func NewJWTService(config Config) JWTService {
	return JWTService{
		config: config,
	}
}

func (s *JWTService) GenerateAccessToken(ctx context.Context, userID string) (string, error) {
	version, err := s.tokenStore.GetUserTokenVersion(ctx, userID)
	if err != nil {
		return "", fmt.Errorf("failed to get token version: %w", err)
	}

	now := time.Now()
	tokenID := uuid.New().String()

	claims := CustomClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        tokenID,
			Subject:   userID,
			Issuer:    s.config.Issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.config.AccessTokenTTL)),
		},
		UserID:       userID,
		TokenVersion: version,
		TokenType:    "access",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString(s.config.AccessTokenSecret)
	if err != nil {
		return "", fmt.Errorf("failed to sign access token: %w", err)
	}

	return signedToken, nil
}

func (s *JWTService) GenerateRefreshToken(ctx context.Context, userID string) (string, error) {
	now := time.Now()
	tokenID := uuid.New().String()
	expiresAt := now.Add(s.config.RefreshTokenTTL)

	claims := CustomClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        tokenID,
			Subject:   userID,
			Issuer:    s.config.Issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
		UserID:    userID,
		TokenType: "refresh",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString(s.config.RefreshTokenSecret)
	if err != nil {
		return "", fmt.Errorf("failed to sign access token: %w", err)
	}

	if err := s.tokenStore.StoreRefreshToken(ctx, tokenID, userID); err != nil {
		return "", fmt.Errorf("failed to store refresh token: %w", err)
	}

	return signedToken, nil
}

func (s *JWTService) GenerateTokenPair(ctx context.Context, userID string) (TokenPair, error) {
	at, err := s.GenerateAccessToken(ctx, userID)
	if err != nil {
		return TokenPair{}, fmt.Errorf("failed to generate access token: %w", err)
	}

	rt, err := s.GenerateRefreshToken(ctx, userID)
	if err != nil {
		return TokenPair{}, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	return TokenPair{
		AccessToken:  at,
		RefreshToken: rt,
	}, nil
}

func (s *JWTService) ValidateAccessToken(ctx context.Context, tokenString string) (*CustomClaims, error) {
	token, err := jwt.ParseWithClaims(
		tokenString,
		&CustomClaims{},
		func(t *jwt.Token) (interface{}, error) {
			// Prevent Algorithm Confusion Attacks
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return s.config.AccessTokenSecret, nil
		},
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithIssuer(s.config.Issuer),
		jwt.WithExpirationRequired(),
	)

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}

	claims, ok := token.Claims.(*CustomClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidClaims
	}

	if claims.TokenType != "access" {
		return nil, ErrInvalidToken
	}

	currentVersion, err := s.tokenStore.GetUserTokenVersion(ctx, claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user token version: %w", err)
	}
	if claims.TokenVersion < currentVersion {
		return nil, ErrTokenRevoked
	}

	return claims, nil
}

func (s *JWTService) RefreshTokens(ctx context.Context, refreshTokenString string) (TokenPair, error) {
	token, err := jwt.ParseWithClaims(
		refreshTokenString,
		&CustomClaims{},
		func(t *jwt.Token) (interface{}, error) {
			// Prevent Algorithm Confusion Attacks
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return s.config.RefreshTokenSecret, nil
		},
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithIssuer(s.config.Issuer),
		jwt.WithExpirationRequired(),
	)

	if err != nil {
		return TokenPair{}, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}

	claims, ok := token.Claims.(*CustomClaims)
	if !ok || !token.Valid {
		return TokenPair{}, ErrInvalidClaims
	}

	if claims.TokenType != "refresh" {
		return TokenPair{}, ErrInvalidTokenType
	}

	valid, err := s.tokenStore.IsRefreshTokenValid(ctx, claims.ID)
	if err != nil {
		return TokenPair{}, fmt.Errorf("failed to get refresh token: %w", err)
	}
	if !valid {
		return TokenPair{}, ErrInvalidToken
	}

	if err := s.tokenStore.RevokeRefreshToken(ctx, claims.ID); err != nil {
		return TokenPair{}, fmt.Errorf("failed to revoke old refresh token: %w", err)
	}

	return s.GenerateTokenPair(ctx, claims.UserID)
}

func (s *JWTService) RevokeAllUserTokens(ctx context.Context, userID string) error {
	err := s.tokenStore.IncrementUserTokenVersion(ctx, userID)
	if err != nil {
		return fmt.Errorf("incrementing user token version failed: %w", err)
	}

	err = s.tokenStore.RevokeAllRefreshTokens(ctx, userID)
	if err != nil {
		return fmt.Errorf("revoking refresh tokens failed: %w", err)
	}

	return nil
}
