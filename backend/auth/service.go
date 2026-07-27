package auth

import (
	"autora-backend/token"
	"context"
	"fmt"
)

// --- Interface for providing all actions regarding auth
type AuthActions interface {
	// Validate login data & return userID
	Login(ctx context.Context, data LoginData) (string, error)
	// Write new user & return userID
	Signup(ctx context.Context, data SignupData) (string, error)
}

// --- Abstract the needed token operations
type TokenGenerator interface {
	GenerateTokenPair(ctx context.Context, userID string) (token.TokenPair, error)
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
