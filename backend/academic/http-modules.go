package academic

import (
	"autora-backend/mw"
	"autora-backend/token"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
)

type ModulesActions interface {
	GetModulesForSemester(ctx context.Context, userID, semesterID string) ([]Module, error)
}

// --- Handler for retrieving all modules for a semester
type ModuleBySemsterHandler struct {
	actions ModulesActions
}

type ModuleBySemesterRequest struct {
	SemesterID string `json:"semesterID"`
}

func (h *ModuleBySemsterHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	claims, err := token.GetClaimsFromContext(r.Context())
	if err != nil {
		slog.Error("missing token claims in context")
		mw.SetErrorAsJSON(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userID := claims.UserID

	var data ModuleBySemesterRequest
	err = json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		mw.SetErrorAsJSON(w, "invalid request body", http.StatusBadRequest)
		return
	}

	modules, err := h.actions.GetModulesForSemester(r.Context(), userID, data.SemesterID)
	if err != nil {
		slog.Error("Failed to get modules by semester", "error", err)
		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(modules)
}
func NewModuleBySemesterHandler(authMiddleware mw.Middleware, actions ModulesActions) http.Handler {
	handler := &ModuleBySemsterHandler{
		actions: actions,
	}
	return mw.CoreChain(handler, authMiddleware)
}
