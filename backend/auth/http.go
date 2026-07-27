package auth

import (
	"autora-backend/mw"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/mail"
	"strings"
)

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

func (a *authHandler) CreateRefreshTokenCookie(tokenValue string) http.Cookie {
	return http.Cookie{
		Name:  "autora-refreshToken",
		Value: tokenValue,
		// Domain as "" lets the browser automatically fill the domain
		Domain:   "",
		Path:     "/api/auth/refresh",
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		HttpOnly: true,
		MaxAge:   a.refreshTokenTTL,
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
		http.Error(w, fmt.Sprintf("Error on decoding JSON: %v", err), http.StatusBadRequest)
		return
	}

	// Email address validation
	_, err = mail.ParseAddress(loginData.Email)
	if err != nil {
		http.Error(w, "Invalid email", http.StatusBadRequest)
		return
	}

	tokens, err := h.service.LoginUserAndGenerateToken(r.Context(), loginData)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		} else {
			slog.Error("Login failed", "error", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
		}
		return
	}

	// TODO: add cookie with refresh token
	w.Write([]byte(tokens.AccessToken))
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
		http.Error(w, fmt.Sprintf("Error on decoding JSON: %v", err), http.StatusBadRequest)
		return
	}

	// --- Validate signup parameters
	// Email address
	_, err = mail.ParseAddress(signupData.Email)
	if err != nil {
		http.Error(w, "Invalid email", http.StatusBadRequest)
		return
	}
	// Password
	if len(signupData.Password) < 8 {
		http.Error(w, "Password not long enough", http.StatusBadRequest)
		return
	}
	// Full name
	signupData.FullName = strings.TrimSpace(signupData.FullName)
	if signupData.FullName == "" {
		http.Error(w, "Full name cannot be empty", http.StatusBadRequest)
		return
	}

	tokens, err := h.service.RegisterUserAndGenerateToken(r.Context(), signupData)
	if err != nil {
		if errors.Is(err, ErrEmailAlreadyExisting) {
			http.Error(w, "Email already registered", http.StatusConflict)
		} else {
			slog.Error("Signup failed", "error", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
		}
		return
	}

	// TODO: add cookie with refresh token
	w.Write([]byte(tokens.AccessToken))
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
