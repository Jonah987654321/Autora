package tasks

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

// Full task model for a database entry
type Task struct {
	ID               bson.ObjectID  `bson:"_id,omitempty" json:"id"`
	UserID           bson.ObjectID  `bson:"userID" json:"-"`
	ModuleID         *bson.ObjectID `bson:"moduleID,omitempty" json:"moduleID,omitempty"`
	Title            string         `bson:"title" json:"title"`
	Description      string         `bson:"description" json:"description"`
	DueDate          *time.Time     `bson:"dueDate,omitempty" json:"dueDate,omitempty"`
	EstimatedMinutes int            `bson:"estimatedMinutes" json:"estimatedMinutes"`
	Status           TaskStatus     `bson:"status" json:"status"`
	IsParent         bool           `bson:"isParent" json:"isParent"`
	ParentTask       *bson.ObjectID `bson:"parentTask,omitempty" json:"parentTask,omitempty"`
	IsTemplate       bool           `bson:"isTemplate" json:"isTemplate"`
	SeriesID         *bson.ObjectID `bson:"seriesID,omitempty" json:"seriesID,omitempty"`
	RepeatDays       int            `bson:"repeatDays,omitempty" json:"repeatDays,omitempty"`
	SeriesShadowID   int            `bson:"shadowID" json:"-"`
	IsDeletedShadow  bool           `bson:"isDeletedShadow" json:"-"`
	IsModifiedShadow bool           `bson:"isModifiedShadow" json:"-"`
}

// Data for a task request that has been validated
type ValidatedTaskRequest struct {
	ModuleID         *bson.ObjectID
	Title            string
	Description      string
	DueDate          *time.Time
	EstimatedMinutes int
	Status           TaskStatus
	IsParent         bool
	ParentTask       *bson.ObjectID
	IsTemplate       bool
	SeriesID         *bson.ObjectID
	RepeatDays       int
	SeriesShadowID   int
	IsDeletedShadow  bool
	IsModifiedShadow bool
}

// --- Models for parsing requests
type TaskRequest struct {
	ModuleID         string     `json:"moduleID,omitempty"`
	Title            string     `json:"title"`
	Description      string     `json:"description"`
	DueDate          *time.Time `json:"dueDate,omitempty"`
	EstimatedMinutes int        `json:"estimatedMinutes"`
	Status           TaskStatus `json:"status"`
	ParentTask       string     `json:"parentTask,omitempty"`
	IsTemplate       bool       `json:"isTemplate"`
	RepeatDays       int        `json:"repeatDays,omitempty"`
}

type TaskModificationRequest struct {
	UpdateCompleteSeries int  `json:"updateCompleteSeries"`
	OverwriteModified    bool `json:"overwriteModified"`
}

type TaskUpdateRequest struct {
	TaskRequest
	TaskModificationRequest
}
