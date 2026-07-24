package auth

import (
	"autora-backend/mw"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
)

// --- Structs for decoding received JSON
// Data for login
type LoginData struct {
	Email 	string 	`json:"email"`
	Password string `json:"password"`
}

// --- Interface for providing all actions regarding auth
type AuthActions interface {
	Login(ctx context.Context, email, password string) (string, error)
}

// --- Handle Logins and handout JWT tokens
type LoginHandler struct {
	actions AuthActions
}
func (h *LoginHandler) ServeHTTP(w http.ResponseWriter, r *http.Request)  {
	defer r.Body.Close()

	//  To prevent abuse, limit body length to 1MB
	r.Body = http.MaxBytesReader(w, r.Body, 1048576)

	var loginData LoginData
	err := json.NewDecoder(r.Body).Decode(&loginData)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error on decoding JSON: %v", err), http.StatusBadRequest)
		return
	}

	generatedToken, err := h.actions.Login(r.Context(), loginData.Email, loginData.Password)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		} else {
			log.Printf("ERROR: Internal error on login: %v", err)
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