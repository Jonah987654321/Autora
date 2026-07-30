package token

// --- Source code from
// https://oneuptime.com/blog/post/2026-01-07-go-jwt-authentication/

import (
	"autora-backend/mw"
	"context"
	"errors"
	"net/http"
	"strings"
)

// ContextKey is a custom type for context keys to avoid collisions.
type ContextKey string

const (
	// ClaimsContextKey is the context key for storing JWT claims.
	ClaimsContextKey ContextKey = "claims"
)

// AuthMiddleware creates an HTTP middleware that validates JWT tokens.
// It extracts the token from the Authorization header and validates it.
func AuthMiddleware(jwtService *JWTService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract the Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				mw.SetErrorAsJSON(w, "missing authorization header", http.StatusUnauthorized)
				return
			}

			// Verify Bearer token format
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
				mw.SetErrorAsJSON(w, "invalid authorization header format", http.StatusUnauthorized)
				return
			}

			tokenString := parts[1]

			// Validate the token
			claims, err := jwtService.ValidateAccessToken(r.Context(), tokenString)
			if err != nil {
				switch {
				case errors.Is(err, ErrExpiredToken):
					mw.SetErrorAsJSON(w, "token expired", http.StatusUnauthorized)
				case errors.Is(err, ErrTokenRevoked):
					mw.SetErrorAsJSON(w, "token revoked", http.StatusUnauthorized)
				default:
					mw.SetErrorAsJSON(w, "invalid token", http.StatusUnauthorized)
				}
				return
			}

			// Add claims to the request context
			ctx := context.WithValue(r.Context(), ClaimsContextKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetClaimsFromContext extracts the JWT claims from the request context.
func GetClaimsFromContext(ctx context.Context) (*CustomClaims, bool) {
	claims, ok := ctx.Value(ClaimsContextKey).(*CustomClaims)
	return claims, ok
}
