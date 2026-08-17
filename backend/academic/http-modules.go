package academic

import (
	"autora-backend/mw"
	"autora-backend/token"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"slices"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type ModulesActions interface {
	GetModulesForSemester(ctx context.Context, userID, semesterID string) ([]Module, error)
	CreateModule(ctx context.Context, userID, semesterID string, req CreateModuleRequest) (*Module, error)
	GetModuleByID(ctx context.Context, userID, moduleID string) (*Module, error)
	EditModule(ctx context.Context, userID, moduleID string, req EditModuleRequest) (*Module, error)
	SetWeeklySchedule(ctx context.Context, userID, moduleID string, req []WeeklyScheduleEntry) error
}

// --- Handler for retrieving all modules for a semester
type ModuleBySemesterHandler struct {
	actions ModulesActions
}

func (h *ModuleBySemesterHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	claims, err := token.GetClaimsFromContext(r.Context())
	if err != nil {
		slog.Error("missing token claims in context")
		mw.SetErrorAsJSON(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userID := claims.UserID

	semesterId := r.PathValue("id")

	modules, err := h.actions.GetModulesForSemester(r.Context(), userID, semesterId)
	if err != nil {
		slog.Error("Failed to get modules by semester", "error", err)
		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(modules)
}
func NewModuleBySemesterHandler(authMiddleware mw.Middleware, actions ModulesActions) http.Handler {
	handler := &ModuleBySemesterHandler{
		actions: actions,
	}
	return mw.CoreChain(handler, authMiddleware)
}

// --- Handle creating semesters
type CreateModuleRequest struct {
	Name         string           `json:"name"`
	Abbreviation string           `json:"abbreviation"`
	Color        string           `json:"color"`
	ECTS         *int             `json:"ects,omitempty"`
	Grade        *bson.Decimal128 `json:"grade,omitempty"`
}

type CreateModuleHandler struct {
	actions ModulesActions
}

func (h *CreateModuleHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	claims, err := token.GetClaimsFromContext(r.Context())
	if err != nil {
		slog.Error("missing token claims in context")
		mw.SetErrorAsJSON(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userID := claims.UserID

	semesterId := r.PathValue("id")

	var req CreateModuleRequest
	err = json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		mw.SetErrorAsJSON(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		mw.SetErrorAsJSON(w, "name cannot be empty", http.StatusBadRequest)
		return
	}
	if req.Abbreviation == "" {
		mw.SetErrorAsJSON(w, "abbreviation cannot be empty", http.StatusBadRequest)
		return
	}
	if req.Color == "" || (!slices.Contains([]string{"red", "orange", "amber", "green", "emerald", "blue", "indigo", "purple", "pink", "gray"}, req.Color)) {
		req.Color = "gray"
	}

	module, err := h.actions.CreateModule(r.Context(), userID, semesterId, req)
	if err != nil {
		if errors.Is(err, ErrNoSuchSemester) {
			mw.SetErrorAsJSON(w, "target semester does not exist", http.StatusNotFound)
			return
		}

		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(module)
}
func NewCreateModuleHandler(authMiddleware mw.Middleware, actions ModulesActions) http.Handler {
	handler := &CreateModuleHandler{
		actions: actions,
	}
	return mw.CoreChain(handler, authMiddleware)
}

// --- Get single module
type GetModuleByIDHandler struct {
	actions ModulesActions
}

func (h *GetModuleByIDHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// --- Get userID
	claims, err := token.GetClaimsFromContext(r.Context())
	if err != nil {
		slog.Error("missing token claims in context")
		mw.SetErrorAsJSON(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userID := claims.UserID

	id := r.PathValue("id")

	module, err := h.actions.GetModuleByID(r.Context(), userID, id)
	if err != nil {
		if errors.Is(err, ErrNoSuchModule) {
			mw.SetErrorAsJSON(w, "module not found", http.StatusNotFound)
			return
		}

		slog.Error("Get module by id failed", "error", err, "moduleID", id)
		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(module)
}
func NewGetModuleByIDHandler(authMiddleware mw.Middleware, actions ModulesActions) http.Handler {
	handler := &GetModuleByIDHandler{
		actions: actions,
	}
	return mw.CoreChain(handler, authMiddleware)
}

// --- Edit Modules
type EditModuleHandler struct {
	actions ModulesActions
}

type EditModuleRequest struct {
	SemesterID   string           `json:"semester"`
	Name         string           `json:"name"`
	Abbreviation string           `json:"abbreviation"`
	Color        string           `json:"color"`
	ECTS         *int             `json:"ects,omitempty"`
	Grade        *bson.Decimal128 `json:"grade,omitempty"`
}

func (h *EditModuleHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	claims, err := token.GetClaimsFromContext(r.Context())
	if err != nil {
		slog.Error("missing token claims in context")
		mw.SetErrorAsJSON(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userID := claims.UserID

	moduleID := r.PathValue("id")

	var req EditModuleRequest
	err = json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		mw.SetErrorAsJSON(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		mw.SetErrorAsJSON(w, "name cannot be empty", http.StatusBadRequest)
		return
	}
	if req.Abbreviation == "" {
		mw.SetErrorAsJSON(w, "abbreviation cannot be empty", http.StatusBadRequest)
		return
	}
	if req.Color == "" || (!slices.Contains([]string{"red", "orange", "amber", "green", "emerald", "blue", "indigo", "purple", "pink", "gray"}, req.Color)) {
		req.Color = "gray"
	}

	module, err := h.actions.EditModule(r.Context(), userID, moduleID, req)
	if err != nil {
		if errors.Is(err, ErrNoSuchModule) {
			mw.SetErrorAsJSON(w, "target module does not exist", http.StatusNotFound)
			return
		}

		if errors.Is(err, ErrNoSuchSemester) {
			mw.SetErrorAsJSON(w, "target semester does not exist", http.StatusBadRequest)
			return
		}

		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(module)
}
func NewEditModuleHandler(authMiddleware mw.Middleware, actions ModulesActions) http.Handler {
	handler := &EditModuleHandler{
		actions: actions,
	}
	return mw.CoreChain(handler, authMiddleware)
}

// --- Manage setting weekly schedules
type SetWeeklyScheduleHandler struct {
	actions ModulesActions
}

func (h *SetWeeklyScheduleHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	claims, err := token.GetClaimsFromContext(r.Context())
	if err != nil {
		slog.Error("missing token claims in context")
		mw.SetErrorAsJSON(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userID := claims.UserID

	moduleID := r.PathValue("id")

	var data []WeeklyScheduleEntry
	err = json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		mw.SetErrorAsJSON(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// --- Validate entries
	for _, el := range data {
		if el.Weekday < 1 || el.Weekday > 7 ||
			el.Start < 0 || el.Start >= 24*60 ||
			el.End < 0 || el.End > 24*60 ||
			el.Start >= el.End ||
			el.Type < 0 || el.Type > 8 {
				mw.SetErrorAsJSON(w, "invalid entry data", http.StatusBadRequest)
				return
		}
	}

	err = h.actions.SetWeeklySchedule(r.Context(), userID, moduleID, data)
	if err != nil {
		if errors.Is(err, ErrNoSuchModule) {
			mw.SetErrorAsJSON(w, "target module does not exist", http.StatusNotFound)
			return
		}

		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
func NewSetWeeklyScheduleHandler(authMiddleware mw.Middleware, actions ModulesActions) http.Handler {
	handler := &SetWeeklyScheduleHandler{
		actions: actions,
	}
	return mw.CoreChain(handler, authMiddleware)
}
