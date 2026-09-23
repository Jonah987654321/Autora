package notes

import (
	"autora-backend/mw"
	"autora-backend/token"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type NoteActions interface {
	CreateNote(ctx context.Context, userID, moduleID string, title string, start, end time.Time) (*Note, error)
	UpdateNote(ctx context.Context, noteID, userID, moduleID string, title string, start, end time.Time, content, summary bson.M, summaryDone bool) (*Note, error)
	DeleteNote(ctx context.Context, userID, noteID string) error
	GetNoteByID(ctx context.Context, userID, noteID string) (*Note, error)
	GetNotesByModuleID(ctx context.Context, userID, moduleID string) ([]Note, error)
}

type CreateNoteRequest struct {
	ModuleID string    `json:"moduleID"`
	Title    string    `json:"title"`
	Start    time.Time `json:"start"`
	End      time.Time `json:"end"`
}

type CreateNoteHandler struct {
	actions NoteActions
}

func (h *CreateNoteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID := token.GetUserIDFromContext(r.Context())

	var req CreateNoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		mw.SetErrorAsJSON(w, "invalid request body", http.StatusBadRequest)
		return
	}

	note, err := h.actions.CreateNote(r.Context(), userID, req.ModuleID, req.Title, req.Start, req.End)
	if err != nil {
		if errors.Is(err, ErrEndBeforeStart) {
			mw.SetErrorAsJSON(w, "end cannot be before start", http.StatusBadRequest)
			return
		}

		if errors.Is(err, ErrNoSuchModule) {
			mw.SetErrorAsJSON(w, "module not found", http.StatusNotFound)
			return
		}

		slog.Error("failed to create note", "error", err)
		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(note)
}
func NewCreateNoteHandler(authMiddleware mw.Middleware, actions NoteActions) http.Handler {
	handler := CreateNoteHandler{
		actions: actions,
	}
	return mw.CoreChain(&handler, authMiddleware)
}

type UpdateNoteRequest struct {
	CreateNoteRequest
	Content     bson.M `json:"content"`
	Summary     bson.M `json:"summary"`
	SummaryDone bool   `json:"summaryDone"`
}

type UpdateNoteHandler struct {
	actions NoteActions
}

func (h *UpdateNoteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID := token.GetUserIDFromContext(r.Context())
	noteID := r.PathValue("id")

	var req UpdateNoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		mw.SetErrorAsJSON(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Content == nil {
		req.Content = bson.M{}
	}
	if req.Summary == nil {
		req.Summary = bson.M{}
	}

	note, err := h.actions.UpdateNote(r.Context(), noteID, userID, req.ModuleID, req.Title, req.Start, req.End, req.Content, req.Summary, req.SummaryDone)
	if err != nil {
		if errors.Is(err, ErrNoSuchNote) {
			mw.SetErrorAsJSON(w, "note not found", http.StatusNotFound)
			return
		}

		if errors.Is(err, ErrEndBeforeStart) {
			mw.SetErrorAsJSON(w, "end cannot be before start", http.StatusBadRequest)
			return
		}

		if errors.Is(err, ErrNoSuchModule) {
			mw.SetErrorAsJSON(w, "module not found", http.StatusNotFound)
			return
		}

		slog.Error("failed to update note", "error", err)
		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(note)
}
func NewUpdateNoteHandler(authMiddleware mw.Middleware, actions NoteActions) http.Handler {
	handler := UpdateNoteHandler{
		actions: actions,
	}
	return mw.CoreChain(&handler, authMiddleware)
}

type DeleteNoteHandler struct {
	actions NoteActions
}

func (h *DeleteNoteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID := token.GetUserIDFromContext(r.Context())
	noteID := r.PathValue("id")

	err := h.actions.DeleteNote(r.Context(), userID, noteID)
	if err != nil {
		if errors.Is(err, ErrNoSuchNote) {
			mw.SetErrorAsJSON(w, "note not found", http.StatusNotFound)
			return
		}

		slog.Error("failed to delete note", "error", err)
		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
func NewDeleteNoteHandler(authMiddleware mw.Middleware, actions NoteActions) http.Handler {
	handler := DeleteNoteHandler{
		actions: actions,
	}
	return mw.CoreChain(&handler, authMiddleware)
}

type GetNoteByIDHandler struct {
	actions NoteActions
}

func (h *GetNoteByIDHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID := token.GetUserIDFromContext(r.Context())
	noteID := r.PathValue("id")

	note, err := h.actions.GetNoteByID(r.Context(), userID, noteID)
	if err != nil {
		if errors.Is(err, ErrNoSuchNote) {
			mw.SetErrorAsJSON(w, "note not found", http.StatusNotFound)
			return
		}

		slog.Error("failed to fetch note by id", "error", err)
		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(note)
}
func NewGetNoteByIDHandler(authMiddleware mw.Middleware, actions NoteActions) http.Handler {
	handler := GetNoteByIDHandler{
		actions: actions,
	}
	return mw.CoreChain(&handler, authMiddleware)
}

type GetNotesByModuleIDHandler struct {
	actions NoteActions
}

func (h *GetNotesByModuleIDHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID := token.GetUserIDFromContext(r.Context())
	moduleID := r.PathValue("id")

	notes, err := h.actions.GetNotesByModuleID(r.Context(), userID, moduleID)
	if err != nil {
		if errors.Is(err, ErrNoSuchModule) {
			mw.SetErrorAsJSON(w, "module not found", http.StatusNotFound)
			return
		}

		slog.Error("failed to fetch notes by module", "error", err)
		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notes)
}
func NewGetNotesByModuleIDHandler(authMiddleware mw.Middleware, actions NoteActions) http.Handler {
	handler := GetNotesByModuleIDHandler{
		actions: actions,
	}
	return mw.CoreChain(&handler, authMiddleware)
}
