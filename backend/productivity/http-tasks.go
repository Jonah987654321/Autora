package productivity

import (
	"context"
	"time"
)

type TaskActions interface {
	CreateTask(ctx context.Context, userID string, req TaskRequest) (*Task, error)
	UpdateTask(ctx context.Context, taskID, userID string, req TaskUpdateRequest) (*Task, error)
	DeleteTask(ctx context.Context, taskID, userID string, req TaskDeleteRequest) error
}

type TaskRequest struct {
	ModuleID         string     `json:"moduleID,omitempty"`
	Title            string     `json:"title"`
	Description      string     `json:"description"`
	DueDate          *time.Time `json:"dueDate,omitempty"`
	EstimatedMinutes int        `json:"estimatedMinutes"`
	Status           TaskStatus `json:"status"`
	ParentTask       string     `json:"parentTask,omitempty"`
	IsTemplate       bool       `json:"isTemplate"`
	SeriesID         string     `json:"seriesID,omitempty"`
	RepeatDays       int        `json:"repeatDays,omitempty"`
}

const (
	BEHAVIOR_SeriesUpdate_None     = 0
	BEHAVIOR_SeriesUpdate_All      = 1
	BEHAVIOR_SeriesUpdate_Upcoming = 2
)

type TaskModificationRequest struct {
	UpdateCompleteSeries int  `json:"updateCompleteSeries"`
	OverwriteModified    bool `json:"overwriteModified"`
}

type TaskUpdateRequest struct {
	TaskRequest
	TaskModificationRequest
}

type TaskDeleteRequest struct {
	TaskModificationRequest
}
