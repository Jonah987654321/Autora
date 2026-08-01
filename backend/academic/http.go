package academic

import (
	"autora-backend/mw"
	"autora-backend/token"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
)

type SemesterActions interface {
	CreateSemester(ctx context.Context, userID string, data CreateSemesterRequest) (string, error)
	GetAllSemesters(ctx context.Context, userID string) ([]Semester, error)
	GetActiveSemester(ctx context.Context, userID string) (*Semester, error)
	GetSemesterByID(ctx context.Context, userID, semesterID string) (*Semester, error)
}

type SemesterHandler struct {
	actions SemesterActions
}

// --- Handling for creating semesters
type CreateSemesterRequest struct {
	Name      string    `json:"name"`
	StartDate JBsonTime `json:"startDate"`
	EndDate   JBsonTime `json:"endDate"`
}
type CreateSemesterHandler struct {
	SemesterHandler
}

func (h *CreateSemesterHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var data CreateSemesterRequest

	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		mw.SetErrorAsJSON(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// --- Validate data
	if data.EndDate.Before(data.StartDate.Time) {
		mw.SetErrorAsJSON(w, "start date cannot be after end date", http.StatusBadRequest)
		return
	}
	if data.Name == "" {
		mw.SetErrorAsJSON(w, "name cannot be empty", http.StatusBadRequest)
		return
	}

	// --- Get userID
	claims, err := token.GetClaimsFromContext(r.Context())
	if err != nil {
		slog.Error("missing token claims in context")
		mw.SetErrorAsJSON(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// --- Create it in the database
	createdID, err := h.actions.CreateSemester(r.Context(), claims.UserID, data)
	if err != nil {
		if errors.Is(err, ErrSemesterOverlapping) {
			mw.SetErrorAsJSON(w, "Semesters cannot overlap", http.StatusConflict)
			return
		}

		slog.Error("Create semester failed", "error", err)
		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// --- Response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"createdID": createdID,
	})
}
func NewCreateSemesterHandler(authMiddleware mw.Middleware, actions SemesterActions) http.Handler {
	handler := &CreateSemesterHandler{
		SemesterHandler: SemesterHandler{
			actions: actions,
		},
	}
	return mw.CoreChain(handler, authMiddleware)
}

// --- Handling for retrieving all semesters
type GetAllSemestersHandler struct {
	SemesterHandler
}

func (h *GetAllSemestersHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// --- Get userID
	claims, err := token.GetClaimsFromContext(r.Context())
	if err != nil {
		slog.Error("missing token claims in context")
		mw.SetErrorAsJSON(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userID := claims.UserID

	semesters, err := h.actions.GetAllSemesters(r.Context(), userID)
	if err != nil {
		slog.Error("Get all semesters failed", "error", err)
		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(semesters)
}
func NewGetAllSemestersHandler(authMiddleware mw.Middleware, actions SemesterActions) http.Handler {
	handler := &GetAllSemestersHandler{
		SemesterHandler: SemesterHandler{
			actions: actions,
		},
	}
	return mw.CoreChain(handler, authMiddleware)
}

// --- Handle retrieving the current semester
type GetActiveSemesterHandler struct {
	SemesterHandler
}

func (h *GetActiveSemesterHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// --- Get userID
	claims, err := token.GetClaimsFromContext(r.Context())
	if err != nil {
		slog.Error("missing token claims in context")
		mw.SetErrorAsJSON(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userID := claims.UserID

	activeSemesters, err := h.actions.GetActiveSemester(r.Context(), userID)
	if err != nil {
		slog.Error("Get current semester failed", "error", err)
		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(activeSemesters)
}
func NewGetActiveSemesterHandler(authMiddleware mw.Middleware, actions SemesterActions) http.Handler {
	handler := &GetActiveSemesterHandler{
		SemesterHandler: SemesterHandler{
			actions: actions,
		},
	}
	return mw.CoreChain(handler, authMiddleware)
}

// Handle retrieving a single semester by id
type GetSemesterByIDHandler struct {
	SemesterHandler
}

func (h *GetSemesterByIDHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// --- Get userID
	claims, err := token.GetClaimsFromContext(r.Context())
	if err != nil {
		slog.Error("missing token claims in context")
		mw.SetErrorAsJSON(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userID := claims.UserID

	id := r.PathValue("id")

	matchedSemester, err := h.actions.GetSemesterByID(r.Context(), userID, id)

	if err != nil {
		if errors.Is(err, ErrNoSuchSemester) {
			mw.SetErrorAsJSON(w, "semester not found", http.StatusNotFound)
			return
		}

		slog.Error("Get semester by id failed", "error", err, "semesterId", id)
		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(matchedSemester)
}
func NewGetSemesterByIDHandler(authMiddleware mw.Middleware, actions SemesterActions) http.Handler {
	handler := &GetSemesterByIDHandler{
		SemesterHandler: SemesterHandler{
			actions: actions,
		},
	}
	return mw.CoreChain(handler, authMiddleware)
}
