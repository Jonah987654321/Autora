package auth

import (
	"autora-backend/mw"
	"context"
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
	Email 	string 	`json:"email"`
	Password string `json:"password"`
}
type SignupData struct {
	Email 	string 	`json:"email"`
	Password string `json:"password"`
	FullName string `json:"fullName"`
}

// --- Interface for providing all actions regarding auth
type AuthActions interface {
	Login(ctx context.Context, data LoginData) (string, error)
	Signup(ctx context.Context, data SignupData) (string, error)
}

// --- Handle Logins and handout JWT tokens
type LoginHandler struct {
	actions AuthActions
}
func (h *LoginHandler) ServeHTTP(w http.ResponseWriter, r *http.Request)  {
	//  To prevent abuse, limit body length to 1MB
	r.Body = http.MaxBytesReader(w, r.Body, 1048576)

	var loginData LoginData
	err := json.NewDecoder(r.Body).Decode(&loginData)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error on decoding JSON: %v", err), http.StatusBadRequest)
		return
	}

	generatedToken, err := h.actions.Login(r.Context(), loginData)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		} else {
			slog.Error("Login failed", "error", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
		}
		return
	}

	// Needs to be replaced with cookie
	w.Write([]byte(generatedToken))
}
func NewLoginHandler(a AuthActions) http.Handler {
	handler := &LoginHandler{
		actions: a,
	}
	return mw.CoreChain(handler, mw.Method("POST"))
}

// Create user accounts
type SignupHandler struct {
	actions AuthActions
}
func (h *SignupHandler) ServeHTTP(w http.ResponseWriter, r *http.Request)  {
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

	generatedToken, err := h.actions.Signup(r.Context(), signupData)
	if err != nil {
		if errors.Is(err, ErrEmailAlreadyExisting) {
			http.Error(w, "Email already registered", http.StatusConflict)
		} else {
			slog.Error("Signup failed", "error", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
		}
		return
	}

	// Needs to be replaced with cookie
	w.Write([]byte(generatedToken))
}
func NewSignupHandler(a AuthActions) http.Handler {
	handler := &SignupHandler{
		actions: a,
	}
	return mw.CoreChain(handler, mw.Method("POST"))
}
