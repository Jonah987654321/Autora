package auth

import (
	"autora-backend/mw"
	"autora-backend/token"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/mail"
	"strings"
)

const RefreshTokenName = "autora-refreshToken"

// --- Structs for decoding received JSON
// Data for login
type LoginData struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}
type SignupData struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"fullName"`
}

// --- Auth Handler abstracts the common parts for all auth handlers
type authHandler struct {
	service         Service
	refreshTokenTTL int
}

func (a *authHandler) CreateRefreshTokenCookie(tokenValue string) *http.Cookie {
	return &http.Cookie{
		Name:  RefreshTokenName,
		Value: tokenValue,
		// Domain as "" lets the browser automatically fill the domain
		Domain: "",
		// /api/auth because both refresh & logout need it
		Path:     "/api/auth",
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		HttpOnly: true,
		MaxAge:   a.refreshTokenTTL,
	}
}
func (a *authHandler) CreateInvalidationCookie() *http.Cookie {
	return &http.Cookie{
		Name:     RefreshTokenName,
		Value:    "",
		Domain:   "",
		Path:     "/api/auth",
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		HttpOnly: true,
		MaxAge:   -1, // Deletes the cookie
	}
}

// --- Handle Logins and handout JWT tokens
type LoginHandler struct {
	authHandler
}

func (h *LoginHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	//  To prevent abuse, limit body length to 1MB
	r.Body = http.MaxBytesReader(w, r.Body, 1048576)

	var loginData LoginData
	err := json.NewDecoder(r.Body).Decode(&loginData)
	if err != nil {
		mw.SetErrorAsJSON(w, fmt.Sprintf("Error on decoding JSON: %v", err), http.StatusBadRequest)
		return
	}

	// Email address validation
	_, err = mail.ParseAddress(loginData.Email)
	if err != nil {
		mw.SetErrorAsJSON(w, "Invalid email", http.StatusBadRequest)
		return
	}

	tokens, err := h.service.LoginUserAndGenerateToken(r.Context(), loginData)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			mw.SetErrorAsJSON(w, "Invalid credentials", http.StatusUnauthorized)
		} else {
			slog.Error("Login failed", "error", err)
			mw.SetErrorAsJSON(w, "Internal server error", http.StatusInternalServerError)
		}
		return
	}

	// --- Create response
	// Set JSON as content type
	w.Header().Set("Content-Type", "application/json")
	// Attach refresh cookie as cookie
	http.SetCookie(w, h.CreateRefreshTokenCookie(tokens.RefreshToken))
	// Put the access token in the body
	json.NewEncoder(w).Encode(map[string]string{
		"accessToken": tokens.AccessToken,
	})
}
func NewLoginHandler(s Service, refreshTokenTTL int) http.Handler {
	handler := &LoginHandler{
		authHandler: authHandler{
			service:         s,
			refreshTokenTTL: refreshTokenTTL,
		},
	}
	return mw.CoreChain(handler, mw.Method("POST"))
}

// --- Create user accounts
type SignupHandler struct {
	authHandler
}

func (h *SignupHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	//  To prevent abuse, limit body length to 1MB
	r.Body = http.MaxBytesReader(w, r.Body, 1048576)

	// --- Parse data from JSON
	var signupData SignupData
	err := json.NewDecoder(r.Body).Decode(&signupData)
	if err != nil {
		mw.SetErrorAsJSON(w, fmt.Sprintf("Error on decoding JSON: %v", err), http.StatusBadRequest)
		return
	}

	// --- Validate signup parameters
	// Email address
	_, err = mail.ParseAddress(signupData.Email)
	if err != nil {
		mw.SetErrorAsJSON(w, "Invalid email", http.StatusBadRequest)
		return
	}
	// Password
	if len(signupData.Password) < 8 {
		mw.SetErrorAsJSON(w, "Password not long enough", http.StatusBadRequest)
		return
	}
	// Full name
	signupData.FullName = strings.TrimSpace(signupData.FullName)
	if signupData.FullName == "" {
		mw.SetErrorAsJSON(w, "Full name cannot be empty", http.StatusBadRequest)
		return
	}

	tokens, err := h.service.RegisterUserAndGenerateToken(r.Context(), signupData)
	if err != nil {
		if errors.Is(err, ErrEmailAlreadyExisting) {
			mw.SetErrorAsJSON(w, "Email already registered", http.StatusConflict)
		} else {
			slog.Error("Signup failed", "error", err)
			mw.SetErrorAsJSON(w, "Internal server error", http.StatusInternalServerError)
		}
		return
	}

	// --- Create response
	// Set JSON as content type
	w.Header().Set("Content-Type", "application/json")
	// Attach refresh cookie as cookie
	http.SetCookie(w, h.CreateRefreshTokenCookie(tokens.RefreshToken))
	// Put the access token in the body
	json.NewEncoder(w).Encode(map[string]string{
		"accessToken": tokens.AccessToken,
	})
}
func NewSignupHandler(s Service, refreshTokenTTL int) http.Handler {
	handler := &SignupHandler{
		authHandler: authHandler{
			service:         s,
			refreshTokenTTL: refreshTokenTTL,
		},
	}
	return mw.CoreChain(handler, mw.Method("POST"))
}

// --- Refresh tokens
type RefreshHandler struct {
	authHandler
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (h *RefreshHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// --- Get the refresh token
	var refreshToken string
	// Source 1 (preferred) - from cookie
	cookie, err := r.Cookie(RefreshTokenName)
	if err == nil {
		refreshToken = cookie.Value
	} else {
		// Source 2 - in request body
		var req RefreshRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			mw.SetErrorAsJSON(w, "invalid request body", http.StatusBadRequest)
			return
		}
		refreshToken = req.RefreshToken
	}

	if refreshToken == "" {
		mw.SetErrorAsJSON(w, "refresh token required", http.StatusBadRequest)
		return
	}

	// --- Perform token refresh
	tokens, err := h.service.VerifiedTokenRefresh(r.Context(), refreshToken)
	if err != nil {
		if errors.Is(err, token.ErrTokenRefused) {
			mw.SetErrorAsJSON(w, "invalid token", http.StatusUnauthorized)
			return
		}

		if errors.Is(err, ErrNonExistingUser) {
			mw.SetErrorAsJSON(w, "user not found", http.StatusUnauthorized)
			return
		}

		slog.Error("Refresh tokens failed", "error", err)
		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// --- Create response
	// Set JSON as content type
	w.Header().Set("Content-Type", "application/json")
	// Overwrite the cookie with the new refresh token
	http.SetCookie(w, h.CreateRefreshTokenCookie(tokens.RefreshToken))
	// Put the access token in the body
	json.NewEncoder(w).Encode(map[string]string{
		"accessToken": tokens.AccessToken,
	})
}
func NewRefreshHandler(s Service, refreshTokenTTL int) http.Handler {
	handler := &RefreshHandler{
		authHandler: authHandler{
			service:         s,
			refreshTokenTTL: refreshTokenTTL,
		},
	}
	return mw.CoreChain(handler, mw.Method("POST"))
}

// --- Unset refresh cookies
type LogoutHandler struct {
	authHandler
}

func (h *LogoutHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// --- Get the refresh token
	var refreshToken string
	// Source 1 (preferred) - from cookie
	cookie, err := r.Cookie(RefreshTokenName)
	if err == nil {
		refreshToken = cookie.Value
	} else {
		// Source 2 - in request body
		var req RefreshRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			mw.SetErrorAsJSON(w, "invalid request body", http.StatusBadRequest)
			return
		}
		refreshToken = req.RefreshToken
	}

	if refreshToken != "" {
		// --- Invalidate token
		// We have a refresh token to invalidate
		// Log errors to find out what when wrong but don't handle them further
		// as the performed action is a log out either way
		err = h.service.tokenService.RevokeSingleRefreshToken(r.Context(), refreshToken)
		if err != nil {
			slog.Error("Logout token revocation failed", "error", err)
		}
	}

	http.SetCookie(w, h.CreateInvalidationCookie())
	w.WriteHeader(http.StatusNoContent)
}
func NewLogoutHandler(s Service, refreshTokenTTL int) http.Handler {
	handler := &LogoutHandler{
		authHandler: authHandler{
			service:         s,
			refreshTokenTTL: refreshTokenTTL,
		},
	}
	return mw.CoreChain(handler, mw.Method("POST"))
}
