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

var (
	// Not-found errors
	ErrNoSuchModule = fmt.Errorf("%w: module", ErrNotFound)
	ErrNoSuchTask   = fmt.Errorf("%w: task", ErrNotFound)

	// Validation errors
	ErrTaskTitleEmpty       = fmt.Errorf("%w: %w", ErrValidationFailed, errors.New("title cannot be empty"))
	ErrInvalidRepeatDays    = fmt.Errorf("%w: %w", ErrValidationFailed, errors.New("repeatDays must be larger than 0"))
	ErrSeriesWithoutDueDate = fmt.Errorf("%w: %w", ErrValidationFailed, errors.New("series templates need a due date"))
	ErrSeriesWithoutModule  = fmt.Errorf("%w: %w", ErrValidationFailed, errors.New("series cannot be created without module"))
	ErrInvalidParentTask    = fmt.Errorf("%w: %w", ErrValidationFailed, errors.New("given parent task is not valid"))
	ErrNotWithinSemester    = fmt.Errorf("%w: %w", ErrValidationFailed, errors.New("dueDate is outside the semester"))
	ErrParentChildDueDate   = fmt.Errorf("%w: %w", ErrValidationFailed, errors.New("child due date cannot be after parent due date"))
	ErrMongoSessionNeeded   = fmt.Errorf("%w: %w", ErrValidationFailed, errors.New("this function needs a mongo session"))
	ErrNegativeEstMinutes   = fmt.Errorf("%w: %w", ErrValidationFailed, errors.New("estimated minutes cannot be negative"))
	ErrInvalidStatus        = fmt.Errorf("%w: %w", ErrValidationFailed, errors.New("status must be a valid status"))
	ErrTitleToLong          = fmt.Errorf("%w: title must not be longer than %v characters", ErrValidationFailed, MAXLEN_Title)
	ErrDescriptionToLong    = fmt.Errorf("%w: description must not be longer than %v characters", ErrValidationFailed, MAXLEN_Description)

	// Wrong-operation errors
	ErrTemplateEdit        = fmt.Errorf("%w: %w", ErrBadOperation, errors.New("a template cannot be edited directly"))
	ErrInvalidUpdateSeries = fmt.Errorf("%w: %w", ErrBadOperation, errors.New("updateCompleteSeries has an invalid value for the task being updated"))
	ErrTemplateDelete      = fmt.Errorf("%w: %w", ErrBadOperation, errors.New("delete cannot be called for a template directly"))
	ErrDeletedShadowModify = fmt.Errorf("%w: %w", ErrBadOperation, errors.New("cannot modify a deleted shadow"))
)
