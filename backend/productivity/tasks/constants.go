package tasks

const (
	MAXLEN_Title       = 255
	MAXLEN_Description = 5000
)

// --- Type for wrapping the status
type TaskStatus int

const (
	StatusOpen TaskStatus = iota
	StatusInProgress
	StatusDone
)

// --- Behavior for series updates
const (
	BEHAVIOR_SeriesUpdate_None     = 0
	BEHAVIOR_SeriesUpdate_Upcoming = 1
	BEHAVIOR_SeriesUpdate_All      = 2
)
