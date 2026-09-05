package tasks

import (
	"autora-backend/mw"
	"autora-backend/token"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
)

type TaskActions interface {
	CreateTask(ctx context.Context, userID string, req TaskRequest) (*Task, error)
	UpdateTask(ctx context.Context, taskID, userID string, req TaskUpdateRequest) (*Task, error)
	DeleteTask(ctx context.Context, taskID, userID string, req TaskDeleteRequest) error
	GetOpenTaskForModule(ctx context.Context, moduleID, userID string) ([]Task, error)
}

// --- Handle creating tasks
type CreateTaskHandler struct {
	actions TaskActions
}

func (h *CreateTaskHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var data TaskRequest
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		mw.SetErrorAsJSON(w, "invalid request body", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	task, err := h.actions.CreateTask(ctx, token.GetUserIDFromContext(ctx), data)
	if err != nil {
		if errors.Is(err, ErrValidationFailed) {
			var pubErr *PublicError
			errors.As(err, &pubErr)
			mw.SetErrorAsJSON(w, pubErr.Error(), http.StatusBadRequest)
			return
		}

		if errors.Is(err, ErrNoSuchModule) {
			mw.SetErrorAsJSON(w, "module not found", http.StatusNotFound)
			return
		}

		slog.Error("creating task failed", "error", err)
		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(task)
}
func NewCreateTaskHandler(authMiddleware mw.Middleware, actions TaskActions) http.Handler {
	handler := CreateTaskHandler{
		actions: actions,
	}
	return mw.CoreChain(&handler, authMiddleware)
}

// --- Handle updating tasks
type UpdateTaskHandler struct {
	actions TaskActions
}

func (h *UpdateTaskHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var data TaskUpdateRequest
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		mw.SetErrorAsJSON(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if data.UpdateCompleteSeries < BEHAVIOR_SeriesUpdate_None || data.UpdateCompleteSeries > BEHAVIOR_SeriesUpdate_All {
		mw.SetErrorAsJSON(w, "updateCompleteSeries must be of [0,1,2]", http.StatusBadRequest)
		return
	}

	taskID := r.PathValue("id")

	ctx := r.Context()
	updated, err := h.actions.UpdateTask(ctx, taskID, token.GetUserIDFromContext(ctx), data)
	if err != nil {
		if errors.Is(err, ErrValidationFailed) {
			var pubErr *PublicError
			errors.As(err, &pubErr)
			mw.SetErrorAsJSON(w, pubErr.Error(), http.StatusBadRequest)
			return
		}

		if errors.Is(err, ErrNoSuchModule) {
			mw.SetErrorAsJSON(w, "module not found", http.StatusNotFound)
			return
		}

		if errors.Is(err, ErrNoSuchTask) {
			mw.SetErrorAsJSON(w, "task not found", http.StatusNotFound)
			return
		}

		if errors.Is(err, ErrBadOperation) {
			var pubErr *PublicError
			errors.As(err, &pubErr)
			mw.SetErrorAsJSON(w, pubErr.Error(), http.StatusBadRequest)
			return
		}

		slog.Error("updating task failed", "error", err)
		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updated)
}
func NewUpdateTaskHandler(authMiddleware mw.Middleware, actions TaskActions) http.Handler {
	handler := UpdateTaskHandler{
		actions: actions,
	}
	return mw.CoreChain(&handler, authMiddleware)
}

// --- Handle deleting tasks
type DeleteTaskHandler struct {
	actions TaskActions
}

func (h *DeleteTaskHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var data TaskDeleteRequest
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		mw.SetErrorAsJSON(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if data.UpdateCompleteSeries < BEHAVIOR_SeriesUpdate_None || data.UpdateCompleteSeries > BEHAVIOR_SeriesUpdate_All {
		mw.SetErrorAsJSON(w, "updateCompleteSeries must be of [0,1,2]", http.StatusBadRequest)
		return
	}

	taskID := r.PathValue("id")

	ctx := r.Context()
	err = h.actions.DeleteTask(ctx, taskID, token.GetUserIDFromContext(ctx), data)
	if err != nil {
		if errors.Is(err, ErrNoSuchTask) {
			mw.SetErrorAsJSON(w, "task not found", http.StatusNotFound)
			return
		}

		if errors.Is(err, ErrBadOperation) {
			var pubErr *PublicError
			errors.As(err, &pubErr)
			mw.SetErrorAsJSON(w, pubErr.Error(), http.StatusBadRequest)
			return
		}

		slog.Error("deleting task failed", "error", err)
		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
func NewDeleteTaskHandler(authMiddleware mw.Middleware, actions TaskActions) http.Handler {
	handler := DeleteTaskHandler{
		actions: actions,
	}
	return mw.CoreChain(&handler, authMiddleware)
}

// --- Handle getting open task for modules
type GetOpenTaskForModuleHandler struct {
	actions TaskActions
}

func (h *GetOpenTaskForModuleHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	moduleID := r.PathValue("id")

	ctx := r.Context()
	tasks, err := h.actions.GetOpenTaskForModule(ctx, moduleID, token.GetUserIDFromContext(ctx))
	if err != nil {
		if errors.Is(err, ErrNoSuchModule) {
			mw.SetErrorAsJSON(w, "module not found", http.StatusNotFound)
			return
		}

		slog.Error("fetching open tasks for module failed", "error", err)
		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tasks)
}
func NewGetOpenTaskForModuleHandler(authMiddleware mw.Middleware, actions TaskActions) http.Handler {
	handler := GetOpenTaskForModuleHandler{
		actions: actions,
	}
	return mw.CoreChain(&handler, authMiddleware)
}
