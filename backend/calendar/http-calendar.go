package calendar

import (
	"autora-backend/mw"
	"autora-backend/token"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"
)

type CalendarActions interface {
	CreateEvent(ctx context.Context, userID string, req EventRequest) (*Event, error)
	UpdateEvent(ctx context.Context, userID, eventID string, req EventRequest) (*Event, error)
	DeleteEvent(ctx context.Context, userID, eventID string) error
	GetUpcomingEventsForModule(ctx context.Context, userID, moduleID string) ([]Event, error)
}

type EventRequest struct {
	ModuleID    string    `json:"moduleID,omitempty"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Start       time.Time `json:"start"`
	End         time.Time `json:"end"`
	Type        int       `json:"type"`
}

// --- HTTP Handler for creating events
type CreateEventHandler struct {
	actions CalendarActions
}

func (h *CreateEventHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID := token.GetUserIDFromContext(r.Context())

	var data EventRequest
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		mw.SetErrorAsJSON(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if data.Title == "" {
		mw.SetErrorAsJSON(w, "title cannot be empty", http.StatusBadRequest)
		return
	}
	if data.Start.Equal(data.End) || data.Start.After(data.End) {
		mw.SetErrorAsJSON(w, "invalid time range", http.StatusBadRequest)
		return
	}
	if data.Type < 0 || data.Type > 6 {
		mw.SetErrorAsJSON(w, "invalid event type", http.StatusBadRequest)
		return
	}

	event, err := h.actions.CreateEvent(r.Context(), userID, data)
	if err != nil {
		if errors.Is(err, ErrNoSuchModule) {
			mw.SetErrorAsJSON(w, "module does not exist", http.StatusNotFound)
			return
		}

		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(event)
}
func NewCreateEventHandler(authMiddleware mw.Middleware, actions CalendarActions) http.Handler {
	handler := CreateEventHandler{
		actions: actions,
	}
	return mw.CoreChain(&handler, authMiddleware)
}

// --- HTTP Handler for updating events
type UpdateEventHandler struct {
	actions CalendarActions
}

func (h *UpdateEventHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID := token.GetUserIDFromContext(r.Context())
	eventID := r.PathValue("id")

	var data EventRequest
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		mw.SetErrorAsJSON(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if data.Title == "" {
		mw.SetErrorAsJSON(w, "title cannot be empty", http.StatusBadRequest)
		return
	}
	if data.Start.Equal(data.End) || data.Start.After(data.End) {
		mw.SetErrorAsJSON(w, "invalid time range", http.StatusBadRequest)
		return
	}
	if data.Type < 0 || data.Type > 6 {
		mw.SetErrorAsJSON(w, "invalid event type", http.StatusBadRequest)
		return
	}

	editedEvent, err := h.actions.UpdateEvent(r.Context(), userID, eventID, data)
	if err != nil {
		if errors.Is(err, ErrNoSuchEvent) {
			mw.SetErrorAsJSON(w, "event does not exist", http.StatusNotFound)
			return
		}
		if errors.Is(err, ErrNoSuchModule) {
			mw.SetErrorAsJSON(w, "module does not exist", http.StatusNotFound)
			return
		}

		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(editedEvent)
}
func NewUpdateEventHandler(authMiddleware mw.Middleware, actions CalendarActions) http.Handler {
	handler := UpdateEventHandler{
		actions: actions,
	}
	return mw.CoreChain(&handler, authMiddleware)
}

// --- HTTP Handler for deleting events
type DeleteEventHandler struct {
	actions CalendarActions
}

func (h *DeleteEventHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID := token.GetUserIDFromContext(r.Context())
	eventID := r.PathValue("id")

	err := h.actions.DeleteEvent(r.Context(), userID, eventID)
	if err != nil {
		if errors.Is(err, ErrNoSuchEvent) {
			mw.SetErrorAsJSON(w, "event not found", http.StatusNotFound)
			return
		}

		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
func NewDeleteEventHandler(authMiddleware mw.Middleware, actions CalendarActions) http.Handler {
	handler := DeleteEventHandler{
		actions: actions,
	}
	return mw.CoreChain(&handler, authMiddleware)
}

// --- Handler for retrieving all current or upcomming events for a given module
type ModuleUpcomingEventHandler struct {
	actions CalendarActions
}

func (h *ModuleUpcomingEventHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID := token.GetUserIDFromContext(r.Context())
	moduleID := r.PathValue("id")

	events, err := h.actions.GetUpcomingEventsForModule(r.Context(), userID, moduleID)
	if err != nil {
		if errors.Is(err, ErrNoSuchModule) {
			mw.SetErrorAsJSON(w, "module not found", http.StatusNotFound)
			return
		}

		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}
func NewModuleUpcomingEventHandler(authMiddleware mw.Middleware, actions CalendarActions) http.Handler {
	handler := ModuleUpcomingEventHandler{
		actions: actions,
	}
	return mw.CoreChain(&handler, authMiddleware)
}
