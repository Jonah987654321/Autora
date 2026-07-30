package auth

import (
	"autora-backend/token"
	"context"
	"errors"
	"fmt"
)

var ErrNonExistingUser = errors.New("user does not exist")

// --- Interface for providing all actions regarding auth
type AuthActions interface {
	// Validate login data & return userID
	Login(ctx context.Context, data LoginData) (string, error)
	// Write new user & return userID
	Signup(ctx context.Context, data SignupData) (string, error)
	// Verify user with given ID exists
	VerifyUserID(ctx context.Context, id string) (bool, error)
}

// --- Abstract the needed token operations
type TokenGenerator interface {
	GenerateTokenPair(ctx context.Context, userID string) (token.TokenPair, error)
	VerifyRefreshToken(ctx context.Context, token string) (string, error)
	RefreshTokens(ctx context.Context, refreshTokenString string) (token.TokenPair, error)
	RevokeSingleRefreshToken(ctx context.Context, refreshTokenString string) error
}

// --- Service serves as orchestrator
func NewService(a AuthActions, t TokenGenerator) Service {
	return Service{
		actions:      a,
		tokenService: t,
	}
}

type Service struct {
	actions      AuthActions
	tokenService TokenGenerator
}

func (s *Service) LoginUserAndGenerateToken(ctx context.Context, data LoginData) (*token.TokenPair, error) {
	userID, err := s.actions.Login(ctx, data)
	if err != nil {
		return nil, fmt.Errorf("retrieving user id failed: %w", err)
	}

	tokens, err := s.tokenService.GenerateTokenPair(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("generating tokens failed: %w", err)
	}

	return &tokens, nil
}

func (s *Service) RegisterUserAndGenerateToken(ctx context.Context, data SignupData) (*token.TokenPair, error) {
	userID, err := s.actions.Signup(ctx, data)
	if err != nil {
		return nil, fmt.Errorf("retrieving user id failed: %w", err)
	}

	tokens, err := s.tokenService.GenerateTokenPair(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("generating tokens failed: %w", err)
	}

	return &tokens, nil
}

func (s *Service) VerifiedTokenRefresh(ctx context.Context, refreshToken string) (*token.TokenPair, error) {
	// --- Parse userID from token
	userID, err := s.tokenService.VerifyRefreshToken(ctx, refreshToken)
	if err != nil {
		return nil, fmt.Errorf("failed to get userid from token: %w", err)
	}

	// --- Verify user actually exists
	exists, err := s.actions.VerifyUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("verification of user id failed: %w", err)
	}
	if !exists {
		return nil, ErrNonExistingUser
	}

	// --- Generate the new tokens
	tokens, err := s.tokenService.RefreshTokens(ctx, refreshToken)
	if err != nil {
		return nil, fmt.Errorf("failed to perform token refresh: %w", err)
	}

	return &tokens, nil
}
