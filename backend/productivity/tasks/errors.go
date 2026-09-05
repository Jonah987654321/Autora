package tasks

import (
	"errors"
	"fmt"
)

var (
	ErrNotFound         = errors.New("tasks: not found")
	ErrValidationFailed = errors.New("tasks: validation failed")
	ErrBadOperation     = errors.New("tasks: bad operation")
)

type PublicError struct {
	category error
	message  string
}

func (e *PublicError) Error() string { return e.message }
func (e *PublicError) Unwrap() error { return e.category }

func newValidationErr(msg string) error {
	return &PublicError{category: ErrValidationFailed, message: msg}
}

func newBadOperationErr(msg string) error {
	return &PublicError{category: ErrBadOperation, message: msg}
}

var (
	// Not-found errors
	ErrNoSuchModule = fmt.Errorf("%w: module", ErrNotFound)
	ErrNoSuchTask   = fmt.Errorf("%w: task", ErrNotFound)

	// Validation errors
	ErrTaskTitleEmpty       = newValidationErr("title cannot be empty")
	ErrInvalidRepeatDays    = newValidationErr("repeatDays must be larger than 0")
	ErrSeriesWithoutDueDate = newValidationErr("series templates need a due date")
	ErrSeriesWithoutModule  = newValidationErr("series cannot be created without module")
	ErrInvalidParentTask    = newValidationErr("given parent task is not valid")
	ErrNotWithinSemester    = newValidationErr("dueDate is outside the semester")
	ErrParentChildDueDate   = newValidationErr("child due date cannot be after parent due date")
	ErrNegativeEstMinutes   = newValidationErr("estimated minutes cannot be negative")
	ErrInvalidStatus        = newValidationErr("status must be a valid status")
	ErrTitleToLong          = newValidationErr(fmt.Sprintf("title must not be longer than %v characters", MAXLEN_Title))
	ErrDescriptionToLong    = newValidationErr(fmt.Sprintf("description must not be longer than %v characters", MAXLEN_Description))

	// Wrong-operation errors
	ErrTemplateEdit        = newBadOperationErr("a template cannot be edited directly")
	ErrInvalidUpdateSeries = newBadOperationErr("updateCompleteSeries has an invalid value for the task being updated")
	ErrTemplateDelete      = newBadOperationErr("delete cannot be called for a template directly")
	ErrDeletedShadowModify = newBadOperationErr("cannot modify a deleted shadow")

	// Internal errors (shouldn't occur)
	ErrMongoSessionNeeded = errors.New("tasks: this function needs a mongo session")
)
