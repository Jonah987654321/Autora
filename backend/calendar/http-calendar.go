package calendar

import (
	"context"
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
