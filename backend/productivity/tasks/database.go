package tasks

import (
	"autora-backend/jsbontime"
	"context"
	"errors"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type ModuleSemesterID struct {
	SemesterID bson.ObjectID `bson:"semesterID"`
}

type SemesterTimeframe struct {
	StartDate jsbontime.JBsonTime `bson:"startDate"`
	EndDate   jsbontime.JBsonTime `bson:"endDate"`
}

// --- Struct providing all task-related actions on the database
type MongoTaskActions struct {
	CollectionTasks     *mongo.Collection
	CollectionModules   *mongo.Collection
	CollectionSemesters *mongo.Collection
}

func (a *MongoTaskActions) fetchSemesterTimeframe(ctx context.Context, semesterID bson.ObjectID) (*SemesterTimeframe, error) {
	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	var semesterTimeframe SemesterTimeframe
	err := a.CollectionSemesters.FindOne(dbCtx, bson.M{"_id": semesterID}).Decode(&semesterTimeframe)
	if err != nil {
		return nil, err
	}

	return &semesterTimeframe, nil
}

func (a *MongoTaskActions) fetchTask(ctx context.Context, taskID, userID bson.ObjectID) (*Task, error) {
	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	var task Task
	err := a.CollectionTasks.FindOne(dbCtx, bson.M{"_id": taskID, "userID": userID}).Decode(&task)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrNoSuchTask
		}

		return nil, fmt.Errorf("failed to fetch task: %w", err)
	}
	return &task, nil
}

func (a *MongoTaskActions) validateTaskRequest(ctx context.Context, req TaskRequest, userID bson.ObjectID, pre *Task) (*ValidatedTaskRequest, error) {
	if pre != nil && pre.IsDeletedShadow {
		return nil, ErrDeletedShadowModify
	}

	validated := ValidatedTaskRequest{
		IsDeletedShadow:  false,
		IsModifiedShadow: false,
	}

	// Templates are not to be edited directly
	if pre != nil && pre.IsTemplate {
		return nil, ErrTemplateEdit
	}

	if req.Title == "" {
		return nil, ErrTaskTitleEmpty
	}
	if len(req.Title) > MAXLEN_Title {
		return nil, ErrTitleToLong
	}
	validated.Title = req.Title

	if len(req.Description) > MAXLEN_Description {
		return nil, ErrDescriptionToLong
	}
	validated.Description = req.Description

	// --- Series ID
	// A seriesID cannot be set from a request as series-tasks are always created automatically
	// This means new tasks always have nil while one with a preexisting record keep the previous
	if pre != nil {
		validated.SeriesID = pre.SeriesID
		validated.SeriesShadowID = pre.SeriesShadowID
	} else {
		validated.SeriesID = nil
		validated.SeriesShadowID = 0
	}

	dbCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// --- Handle moduleID
	// Existing task-series can't be moved to another module, so always keep the previous
	// For all other tasks (newly created & non-series task), parse the moduleID from the request
	var moduleObjectID *bson.ObjectID
	if pre != nil && pre.SeriesID != nil {
		moduleObjectID = pre.ModuleID
	} else if req.ModuleID != "" {
		parsedID, err := bson.ObjectIDFromHex(req.ModuleID)
		if err != nil {
			return nil, ErrNoSuchModule
		}
		moduleObjectID = &parsedID
	}
	// Validate the moduleID against database
	// The retrieved semesterID is also used to extract semester start & end to validate dueDate
	var moduleFromSemester ModuleSemesterID
	if moduleObjectID != nil {
		err := a.CollectionModules.FindOne(dbCtx, bson.M{"_id": moduleObjectID, "userID": userID}).Decode(&moduleFromSemester)
		if err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				return nil, ErrNoSuchModule
			}

			return nil, fmt.Errorf("failed to check if module exists: %w", err)
		}

		validated.ModuleID = moduleObjectID
	}

	if pre != nil && pre.SeriesID != nil && req.DueDate == nil {
		return nil, ErrSeriesWithoutDueDate
	}
	if moduleObjectID != nil && req.DueDate != nil {
		semesterTimeframe, err := a.fetchSemesterTimeframe(ctx, moduleFromSemester.SemesterID)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch semester start/enddate: %w", err)
		}

		if semesterTimeframe.StartDate.After(*req.DueDate) || semesterTimeframe.EndDate.Before(*req.DueDate) {
			return nil, ErrNotWithinSemester
		}
	}
	validated.DueDate = req.DueDate

	if req.IsTemplate {
		if req.DueDate == nil {
			return nil, ErrSeriesWithoutDueDate
		}
		if req.RepeatDays <= 0 {
			return nil, ErrInvalidRepeatDays
		}
		if moduleObjectID == nil {
			return nil, ErrSeriesWithoutModule
		}

		validated.IsTemplate = true
		validated.RepeatDays = req.RepeatDays
	} else {
		validated.IsTemplate = false
		if pre != nil {
			if req.RepeatDays > 0 {
				validated.RepeatDays = req.RepeatDays
			} else {
				validated.RepeatDays = pre.RepeatDays
			}
		} else {
			validated.RepeatDays = 0
		}
	}

	// --- Handle parent-child relations
	// Parent state cannot be set from a request, always take the server value
	validated.IsParent = pre != nil && pre.IsParent
	if validated.IsParent {
		if pre.DueDate != nil && validated.DueDate != nil && !pre.DueDate.Equal(*validated.DueDate) {
			// Validate no childs due date is after the new due date
			count, err := a.CollectionTasks.CountDocuments(dbCtx, bson.M{"parentTask": pre.ID, "dueDate": bson.M{"$gt": validated.DueDate}})
			if err != nil {
				return nil, fmt.Errorf("failed to check child due date for parent due date update")
			}
			if count > 0 {
				return nil, ErrParentChildDueDate
			}
		}
		// Task is a parent, cannot have a parent for itself
		validated.ParentTask = nil
		validated.EstimatedMinutes = 0
		validated.Status = StatusOpen
	} else {
		// No parent -> allowed to have estimated minutes & status
		if req.EstimatedMinutes < 0 {
			return nil, ErrNegativeEstMinutes
		}
		validated.EstimatedMinutes = req.EstimatedMinutes
		if req.Status < StatusOpen || req.Status > StatusDone {
			return nil, ErrInvalidStatus
		}
		validated.Status = req.Status

		var parentTaskID *bson.ObjectID
		if pre != nil {
			// Disallow changing parents for existing tasks
			parentTaskID = pre.ParentTask
		} else if req.ParentTask != "" {
			parentID, err := bson.ObjectIDFromHex(req.ParentTask)
			if err != nil {
				return nil, ErrInvalidParentTask
			}
			parentTaskID = &parentID
		}

		if parentTaskID != nil {
			// Task is a child, validate the parent
			parentTask, err := a.fetchTask(ctx, *parentTaskID, userID)
			if err != nil {
				if errors.Is(err, ErrNoSuchTask) {
					return nil, ErrInvalidParentTask
				}

				return nil, fmt.Errorf("failed to validate parent against database: %w", err)
			}

			// Parent and child must be in the same module (or both in none)
			if (moduleObjectID == nil && parentTask.ModuleID != nil) ||
				(moduleObjectID != nil && parentTask.ModuleID == nil) ||
				(moduleObjectID != nil && parentTask.ModuleID != nil && *moduleObjectID != *parentTask.ModuleID) {
				return nil, ErrInvalidParentTask
			}

			// Parent cannot have a parent itself
			if parentTask.ParentTask != nil {
				return nil, ErrInvalidParentTask
			}

			// Child due date cannot be after parent due date
			if parentTask.DueDate != nil && validated.DueDate != nil && parentTask.DueDate.Before(*validated.DueDate) {
				return nil, ErrParentChildDueDate
			}

			// RepeatDays can only be set in the parent
			// Changes are to be made there which then propagates the changes to all children
			// The same applies for creating, which always takes the value from the parent
			if (pre != nil && pre.SeriesID != nil) || validated.IsTemplate {
				validated.RepeatDays = parentTask.RepeatDays
			}

			validated.ParentTask = parentTaskID
		} else {
			validated.ParentTask = nil
		}
	}

	return &validated, nil
}

func (a *MongoTaskActions) createTask(ctx context.Context, userID bson.ObjectID, validated ValidatedTaskRequest) (*Task, error) {
	task := Task{
		ID:               bson.NewObjectID(),
		UserID:           userID,
		ModuleID:         validated.ModuleID,
		Title:            validated.Title,
		Description:      validated.Description,
		DueDate:          validated.DueDate,
		EstimatedMinutes: validated.EstimatedMinutes,
		Status:           validated.Status,
		IsParent:         validated.IsParent,
		ParentTask:       validated.ParentTask,
		IsTemplate:       validated.IsTemplate,
		SeriesID:         validated.SeriesID,
		RepeatDays:       validated.RepeatDays,
		IsDeletedShadow:  false,
		IsModifiedShadow: false,
	}

	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	_, err := a.CollectionTasks.InsertOne(dbCtx, task)
	if err != nil {
		return nil, err
	}

	return &task, nil
}

func (a *MongoTaskActions) forceGenerateTaskSeries(ctx context.Context, seriesMasterID, userID bson.ObjectID, lastGenerationTime *time.Time, updateBehavior int, startShadowID int, overwriteModified bool) error {
	if session := mongo.SessionFromContext(ctx); session == nil {
		return ErrMongoSessionNeeded
	}

	bulk := make([]interface{}, 0)

	dbCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// --- Fetch master entry for data
	task, err := a.fetchTask(ctx, seriesMasterID, userID)
	if err != nil {
		return fmt.Errorf("failed to fetch template for generating series: %w", err)
	}

	var moduleFromSemester ModuleSemesterID
	err = a.CollectionModules.FindOne(dbCtx, bson.M{"_id": task.ModuleID, "userID": userID}).Decode(&moduleFromSemester)
	if err != nil {
		return fmt.Errorf("failed to retrieve module of template task: %w", err)
	}

	shadowID := 0
	if updateBehavior == BEHAVIOR_SeriesUpdate_Upcoming {
		shadowID = startShadowID
	}
	startTime := task.DueDate.AddDate(0, 0, task.RepeatDays*startShadowID)

	// --- Delete previous generated series tasks
	filter := bson.M{"seriesID": seriesMasterID, "userID": userID}
	if updateBehavior == BEHAVIOR_SeriesUpdate_Upcoming {
		filter["shadowID"] = bson.M{"$gte": startShadowID}
	}
	if !overwriteModified {
		filter["isModifiedShadow"] = false
		filter["isDeletedShadow"] = false
	}
	_, err = a.CollectionTasks.DeleteMany(dbCtx, filter)
	if err != nil {
		return fmt.Errorf("failed to delete existing generated tasks: %w", err)
	}

	var endTime time.Time
	if lastGenerationTime != nil {
		endTime = *lastGenerationTime
	} else {
		semesterTimeframe, err := a.fetchSemesterTimeframe(ctx, moduleFromSemester.SemesterID)
		if err != nil {
			return fmt.Errorf("failed to fetch semester timeframe: %w", err)
		}
		endTime = semesterTimeframe.EndDate.Time
	}

	var lastGenerated *time.Time

	// --- If it is a child template, fetch generated shadow parents for IDs
	parentTasks := []Task{}
	if task.ParentTask != nil {
		res, err := a.CollectionTasks.Find(dbCtx, bson.M{"seriesID": task.ParentTask, "userID": userID})
		if err != nil {
			return fmt.Errorf("failed to fetch created-parent for child of series task")
		}
		err = res.All(dbCtx, &parentTasks)
		if err != nil {
			return fmt.Errorf("failed to decode created-parent for child of series task")
		}
	}
	parentLookup := make(map[int]bson.ObjectID, len(parentTasks))
	for _, doc := range parentTasks {
		parentLookup[doc.SeriesShadowID] = doc.ID
	}

	noOverwriteTasks := []Task{}
	if !overwriteModified {
		res, err := a.CollectionTasks.Find(dbCtx, bson.M{"seriesID": seriesMasterID, "userID": userID})
		if err != nil {
			return fmt.Errorf("failed to fetch not-deleted tasks: %w", err)
		}
		err = res.All(dbCtx, &noOverwriteTasks)
		if err != nil {
			return fmt.Errorf("failed to decode not-deleted tasks: %w", err)
		}
	}
	noOverwriteLookup := make(map[int]bson.ObjectID, len(noOverwriteTasks))
	for _, doc := range noOverwriteTasks {
		noOverwriteLookup[doc.SeriesShadowID] = doc.ID
	}

	for i := startTime; !i.After(endTime); i = i.AddDate(0, 0, task.RepeatDays) {
		var parent *bson.ObjectID
		if task.ParentTask != nil {
			parentID, ok := parentLookup[shadowID]
			if !ok {
				return fmt.Errorf("no generated parent shadow found for shadowID %d", shadowID)
			}
			parent = &parentID
		}
		_, skip := noOverwriteLookup[shadowID]
		if !skip {
			bulk = append(bulk, Task{
				ID:               bson.NewObjectID(),
				UserID:           userID,
				ModuleID:         task.ModuleID,
				Title:            task.Title,
				Description:      task.Description,
				DueDate:          &i,
				EstimatedMinutes: task.EstimatedMinutes,
				Status:           task.Status,
				IsParent:         task.IsParent,
				ParentTask:       parent,
				IsTemplate:       false,
				SeriesID:         &task.ID,
				RepeatDays:       task.RepeatDays,
				SeriesShadowID:   shadowID,
			})
		}
		shadowID++
		lastGenerated = &i
	}

	_, err = a.CollectionTasks.InsertMany(dbCtx, bulk)
	if err != nil {
		return fmt.Errorf("failed to insert new task series: %w", err)
	}

	// If task is a parent and atleast one parent shadow was generated, generate the children
	if task.IsParent && lastGenerated != nil {
		tasks := []Task{}
		res, err := a.CollectionTasks.Find(dbCtx, bson.M{"parentTask": task.ID, "userID": userID})
		if err != nil {
			return fmt.Errorf("failed to fetch children for master series task: %w", err)
		}
		err = res.All(dbCtx, &tasks)
		if err != nil {
			return fmt.Errorf("failed to decode children for master series task: %w", err)
		}
		for _, t := range tasks {
			err := a.forceGenerateTaskSeries(ctx, t.ID, userID, lastGenerated, updateBehavior, startShadowID, overwriteModified)
			if err != nil {
				return fmt.Errorf("child force generation failed: %w", err)
			}
		}
	}

	return nil
}

func (a *MongoTaskActions) performTaskUpdate(ctx context.Context, taskID, userID bson.ObjectID, validated ValidatedTaskRequest) (*Task, error) {
	// Always set these values
	set := bson.M{
		"title":            validated.Title,
		"description":      validated.Description,
		"estimatedMinutes": validated.EstimatedMinutes,
		"status":           validated.Status,
		"isParent":         validated.IsParent,
		"isTemplate":       validated.IsTemplate,
		"isDeletedShadow":  validated.IsDeletedShadow,
		"isModifiedShadow": validated.IsModifiedShadow,
	}
	unset := bson.M{}
	// Conditionally decide wether to set or unset these values
	if validated.ModuleID == nil {
		unset["moduleID"] = ""
	} else {
		set["moduleID"] = validated.ModuleID
	}
	if validated.DueDate == nil {
		unset["dueDate"] = ""
	} else {
		set["dueDate"] = validated.DueDate
	}
	if validated.ParentTask == nil {
		unset["parentTask"] = ""
	} else {
		set["parentTask"] = validated.ParentTask
	}
	if validated.SeriesID == nil {
		unset["seriesID"] = ""
	} else {
		set["seriesID"] = validated.SeriesID
	}
	if validated.RepeatDays == 0 {
		unset["repeatDays"] = ""
	} else {
		set["repeatDays"] = validated.RepeatDays
	}

	update := bson.M{
		"$set": set,
	}
	if len(unset) > 0 {
		update["$unset"] = unset
	}

	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	_, err := a.CollectionTasks.UpdateOne(dbCtx, bson.M{"_id": taskID, "userID": userID}, update)
	if err != nil {
		return nil, err
	}
	return &Task{
		ID:               taskID,
		UserID:           userID,
		ModuleID:         validated.ModuleID,
		Title:            validated.Title,
		Description:      validated.Description,
		DueDate:          validated.DueDate,
		EstimatedMinutes: validated.EstimatedMinutes,
		Status:           validated.Status,
		IsParent:         validated.IsParent,
		ParentTask:       validated.ParentTask,
		IsTemplate:       validated.IsTemplate,
		SeriesID:         validated.SeriesID,
		RepeatDays:       validated.RepeatDays,
	}, nil
}

func (a *MongoTaskActions) updateParentAttributes(ctx context.Context, parentID, userID bson.ObjectID) error {
	parent, err := a.fetchTask(ctx, parentID, userID)
	if err != nil {
		return fmt.Errorf("failed to fetch parent task: %w", err)
	}

	dbCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	children := []Task{}
	res, err := a.CollectionTasks.Find(dbCtx, bson.M{"parentTask": parentID, "userID": userID, "isDeletedShadow": false})
	if err != nil {
		return fmt.Errorf("failed to fetch children: %w", err)
	}
	err = res.All(dbCtx, &children)
	if err != nil {
		return fmt.Errorf("failed to decode children: %w", err)
	}

	if len(children) == 0 {
		_, err = a.CollectionTasks.UpdateOne(dbCtx, bson.M{"_id": parentID, "userID": userID}, bson.M{"$set": bson.M{"isParent": false}})
		if err != nil {
			return fmt.Errorf("failed to write update to db: %w", err)
		}
	} else {
		estimatedMinutes := 0

		allDone := true
		fullyBlocked := true
		allOpen := true

		nonSeriesChild := false

		for _, task := range children {
			allDone = allDone && (task.Status == StatusDone || task.Status == StatusCancelled)
			fullyBlocked = fullyBlocked && (task.Status == StatusDone || task.Status == StatusCancelled || task.Status == StatusBlocked)
			allOpen = allOpen && (task.Status == StatusOpen)
			if task.Status != StatusDone {
				estimatedMinutes += task.EstimatedMinutes
			}
			if task.SeriesID == nil {
				nonSeriesChild = true
			}
		}

		var newStatus TaskStatus
		if allDone {
			newStatus = StatusDone
		} else if allOpen {
			newStatus = StatusOpen
		} else if fullyBlocked {
			newStatus = StatusBlocked
		} else {
			newStatus = StatusInProgress
		}

		update := bson.M{"$set": bson.M{"isParent": true, "status": newStatus, "estimatedMinutes": estimatedMinutes, "isModifiedShadow": parent.IsModifiedShadow || (parent.SeriesID != nil && nonSeriesChild)}}
		_, err = a.CollectionTasks.UpdateOne(dbCtx, bson.M{"_id": parentID, "userID": userID}, update)
		if err != nil {
			return fmt.Errorf("failed to write update to db: %w", err)
		}
	}

	return nil
}

func (a *MongoTaskActions) CreateTask(ctx context.Context, userID string, req TaskRequest) (*Task, error) {
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}

	validated, err := a.validateTaskRequest(ctx, req, userObjectId, nil)
	if err != nil {
		return nil, fmt.Errorf("couldn't validate request: %w", err)
	}

	client := a.CollectionTasks.Database().Client()
	session, err := client.StartSession()
	if err != nil {
		return nil, fmt.Errorf("failed to start mongo session: %w", err)
	}
	defer session.EndSession(ctx)
	res, err := session.WithTransaction(ctx, func(sessCtx context.Context) (interface{}, error) {
		if validated.IsTemplate {

			master, err := a.createTask(sessCtx, userObjectId, *validated)
			if err != nil {
				return nil, fmt.Errorf("failed to insert master task for series: %w", err)
			}
			if validated.ParentTask != nil {
				err = a.updateParentAttributes(sessCtx, *validated.ParentTask, userObjectId)
				if err != nil {
					return nil, fmt.Errorf("failed to update parent attributes: %w", err)
				}
				err = a.forceGenerateTaskSeries(sessCtx, *master.ParentTask, userObjectId, nil, BEHAVIOR_SeriesUpdate_All, 0, false)
				if err != nil {
					return nil, fmt.Errorf("failed to insert new task series: %w", err)
				}
				return master, nil
			}
			err = a.forceGenerateTaskSeries(sessCtx, master.ID, userObjectId, nil, BEHAVIOR_SeriesUpdate_All, 0, true)
			if err != nil {
				return nil, fmt.Errorf("failed to insert new task series: %w", err)
			}
			return master, nil

		} else {
			task, err := a.createTask(sessCtx, userObjectId, *validated)
			if err != nil {
				return nil, fmt.Errorf("failed to insert new task: %w", err)
			}
			if validated.ParentTask != nil {
				err = a.updateParentAttributes(sessCtx, *validated.ParentTask, userObjectId)
				if err != nil {
					return nil, fmt.Errorf("failed to update parent attributes: %w", err)
				}
			}
			return task, nil
		}
	})
	if err != nil {
		return nil, err
	}
	return res.(*Task), nil
}

func (a *MongoTaskActions) UpdateTask(ctx context.Context, taskID, userID string, req TaskUpdateRequest) (*Task, error) {
	// Parse IDs to ObjectIDs
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}
	taskObjectID, err := bson.ObjectIDFromHex(taskID)
	if err != nil {
		return nil, ErrNoSuchTask
	}

	pre, err := a.fetchTask(ctx, taskObjectID, userObjectId)
	if err != nil {
		if errors.Is(err, ErrNoSuchTask) {
			return nil, err
		}

		return nil, fmt.Errorf("failed fetch previous-state: %w", err)
	}

	// Validate the request
	validated, err := a.validateTaskRequest(ctx, req.TaskRequest, userObjectId, pre)
	if err != nil {
		return nil, fmt.Errorf("couldn't validate request: %w", err)
	}

	client := a.CollectionTasks.Database().Client()
	session, err := client.StartSession()
	if err != nil {
		return nil, fmt.Errorf("failed to start mongo session: %w", err)
	}
	defer session.EndSession(ctx)

	res, err := session.WithTransaction(ctx, func(sessCtx context.Context) (interface{}, error) {
		if validated.SeriesID == nil || req.UpdateCompleteSeries == BEHAVIOR_SeriesUpdate_None {
			// A task cannot be made a template without haven UpdateCompleteSeries=true
			if validated.IsTemplate && !pre.IsTemplate {
				return nil, ErrInvalidUpdateSeries
			}

			if validated.SeriesID != nil {
				validated.IsModifiedShadow = true
			}

			// Only the task itself needs to be updated
			res, err := a.performTaskUpdate(sessCtx, taskObjectID, userObjectId, *validated)
			if err != nil {
				return nil, fmt.Errorf("failed to write task update to db: %w", err)
			}
			if validated.ParentTask != nil {
				err = a.updateParentAttributes(sessCtx, *validated.ParentTask, userObjectId)
				if err != nil {
					return nil, fmt.Errorf("failed to update parent attributes: %w", err)
				}
			}
			return res, nil
		} else {
			if validated.SeriesID == nil {
				return nil, ErrInvalidUpdateSeries
			}
			// The series needs updating, update the template & then regenerate the series
			template, err := a.fetchTask(sessCtx, *validated.SeriesID, userObjectId)
			if err != nil {
				return nil, fmt.Errorf("failed fetch template: %w", err)
			}

			validatedTemplate := ValidatedTaskRequest{
				ModuleID:         validated.ModuleID,
				Title:            validated.Title,
				Description:      validated.Description,
				DueDate:          validated.DueDate,
				EstimatedMinutes: validated.EstimatedMinutes,
				Status:           StatusOpen,
				IsParent:         validated.IsParent,
				ParentTask:       template.ParentTask,
				IsTemplate:       true,
				SeriesID:         nil,
				RepeatDays:       validated.RepeatDays,
			}
			res, err := a.performTaskUpdate(sessCtx, *validated.SeriesID, userObjectId, validatedTemplate)
			if err != nil {
				return nil, fmt.Errorf("failed to write task template update to db: %w", err)
			}
			// Check if changed repeatDays need to be propagated to all children
			if validated.RepeatDays != pre.RepeatDays {

				dbCtx, cancel := context.WithTimeout(sessCtx, 2*time.Second)
				defer cancel()

				_, err := a.CollectionTasks.UpdateMany(dbCtx, bson.M{"parentTask": *validated.SeriesID}, bson.M{"$set": bson.M{"repeatDays": validated.RepeatDays}})
				if err != nil {
					return nil, fmt.Errorf("failed to propagate updated repeatDays to children: %w", err)
				}
			}

			if validatedTemplate.ParentTask != nil {
				err = a.updateParentAttributes(sessCtx, *validatedTemplate.ParentTask, userObjectId)
				if err != nil {
					return nil, fmt.Errorf("failed to update parent attributes: %w", err)
				}
			}

			err = a.forceGenerateTaskSeries(sessCtx, *validated.SeriesID, userObjectId, nil, req.UpdateCompleteSeries, validated.SeriesShadowID, req.OverwriteModified)
			if err != nil {
				return nil, fmt.Errorf("failed to regenerate task series: %w", err)
			}

			return res, nil
		}
	})

	if err != nil {
		return nil, err
	}

	return res.(*Task), nil
}

func (a *MongoTaskActions) deleteTemplateHandleShadows(ctx context.Context, taskID, userID bson.ObjectID, seriesUpdate int, overwriteModified bool, shadowID int) error {
	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	// Delete the main template
	_, err := a.CollectionTasks.DeleteOne(dbCtx, bson.M{"_id": taskID, "userID": userID})
	if err != nil {
		return fmt.Errorf("failed to delete main template: %w", err)
	}

	// --- Handle shadows
	// Delete all that need to be deleted (based on the behavior given in the request)
	filter := bson.M{"seriesID": taskID, "userID": userID}
	if seriesUpdate == BEHAVIOR_SeriesUpdate_Upcoming {
		filter["shadowID"] = bson.M{"$gte": shadowID}
	}
	if !overwriteModified {
		filter["isModifiedShadow"] = false
	}
	_, err = a.CollectionTasks.DeleteMany(dbCtx, filter)
	if err != nil {
		return fmt.Errorf("failed to delete shadows of main template: %w", err)
	}
	// If only upcoming were deleted, remove the seriesID from the earlier to make them independent
	if seriesUpdate == BEHAVIOR_SeriesUpdate_Upcoming || !overwriteModified {
		update := bson.M{"$unset": bson.M{"seriesID": "", "shadowID": ""}}
		filter := bson.M{"seriesID": taskID, "userID": userID}
		_, err = a.CollectionTasks.UpdateMany(dbCtx, filter, update)
		if err != nil {
			return fmt.Errorf("failed to update still existing shadow for independence: %w", err)
		}
	}
	return nil
}

func (a *MongoTaskActions) DeleteTask(ctx context.Context, taskID, userID string, seriesUpdate int, overwriteModified bool) error {
	// Parse IDs to ObjectIDs
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}
	taskObjectID, err := bson.ObjectIDFromHex(taskID)
	if err != nil {
		return ErrNoSuchTask
	}

	task, err := a.fetchTask(ctx, taskObjectID, userObjectId)
	if err != nil {
		return fmt.Errorf("failed to get task: %w", err)
	}

	// Use a transaction to only delete everything or rollback if one operation fails
	client := a.CollectionTasks.Database().Client()
	session, err := client.StartSession()
	if err != nil {
		return fmt.Errorf("failed to start mongo session: %w", err)
	}
	defer session.EndSession(ctx)

	_, err = session.WithTransaction(ctx, func(sessCtx context.Context) (interface{}, error) {
		dbCtx, cancel := context.WithTimeout(sessCtx, 15*time.Second)
		defer cancel()

		// Check if task belongs to a series and request indicates to update whole series
		if task.SeriesID != nil && seriesUpdate != BEHAVIOR_SeriesUpdate_None {
			seriesTemplate, err := a.fetchTask(sessCtx, *task.SeriesID, userObjectId)
			if err != nil {
				return nil, fmt.Errorf("failed to get series template: %w", err)
			}

			err = a.deleteTemplateHandleShadows(sessCtx, seriesTemplate.ID, userObjectId, seriesUpdate, overwriteModified, task.SeriesShadowID)
			if err != nil {
				return nil, fmt.Errorf("failed to handle template delete: %w", err)
			}

			if seriesTemplate.IsParent {
				childTemplateTask := []Task{}
				res, err := a.CollectionTasks.Find(dbCtx, bson.M{"parentTask": seriesTemplate.ID, "userID": userObjectId})
				if err != nil {
					return nil, fmt.Errorf("failed to fetch children of deleted template: %w", err)
				}
				err = res.All(dbCtx, &childTemplateTask)
				if err != nil {
					return nil, fmt.Errorf("failed to decode children of deleted template: %w", err)
				}

				for _, childTemplate := range childTemplateTask {
					err = a.deleteTemplateHandleShadows(sessCtx, childTemplate.ID, userObjectId, seriesUpdate, overwriteModified, task.SeriesShadowID)
					if err != nil {
						return nil, fmt.Errorf("failed to handle child template delete: %w", err)
					}
				}
			} else if seriesTemplate.ParentTask != nil {
				err = a.updateParentAttributes(dbCtx, *seriesTemplate.ParentTask, userObjectId)
				if err != nil {
					return nil, fmt.Errorf("failed to update parent attributes: %w", err)
				}
				err = a.forceGenerateTaskSeries(sessCtx, *seriesTemplate.ParentTask, userObjectId, nil, seriesUpdate, task.SeriesShadowID, overwriteModified)
				if err != nil {
					return nil, fmt.Errorf("failed to regenerate task series: %w", err)
				}
			}
		} else {
			if task.IsTemplate {
				return nil, ErrTemplateDelete
			}

			if task.SeriesID != nil {
				// Only mark as deleted shadow, do not actually delete
				_, err := a.performTaskUpdate(sessCtx, task.ID, userObjectId, ValidatedTaskRequest{
					ModuleID:         task.ModuleID,
					Title:            task.Title,
					Description:      task.Description,
					DueDate:          task.DueDate,
					EstimatedMinutes: task.EstimatedMinutes,
					Status:           task.Status,
					IsParent:         task.IsParent,
					ParentTask:       task.ParentTask,
					IsTemplate:       task.IsTemplate,
					SeriesID:         task.SeriesID,
					RepeatDays:       task.RepeatDays,
					SeriesShadowID:   task.SeriesShadowID,
					IsDeletedShadow:  true,
					IsModifiedShadow: false,
				})
				if err != nil {
					return nil, fmt.Errorf("failed to mark shadow as isDeleted: %w", err)
				}
				if task.IsParent {
					_, err = a.CollectionTasks.UpdateMany(dbCtx, bson.M{"parentTask": task.ID, "userID": userObjectId}, bson.M{"$set": bson.M{"isDeletedShadow": true}})
					if err != nil {
						return nil, fmt.Errorf("failed to mark children of main target as deleted: %w", err)
					}
				} else if task.ParentTask != nil {
					err = a.updateParentAttributes(dbCtx, *task.ParentTask, userObjectId)
					if err != nil {
						return nil, fmt.Errorf("failed to update parent attributes: %w", err)
					}
				}
				return nil, nil
			}

			// Delete the task itself
			_, err = a.CollectionTasks.DeleteOne(dbCtx, bson.M{"_id": task.ID, "userID": userObjectId})
			if err != nil {
				return nil, fmt.Errorf("failed to delete main target: %w", err)
			}

			// Delete children
			if task.IsParent {
				_, err = a.CollectionTasks.DeleteMany(dbCtx, bson.M{"parentTask": task.ID, "userID": userObjectId})
				if err != nil {
					return nil, fmt.Errorf("failed to delete children of main target: %w", err)
				}
			} else if task.ParentTask != nil {
				err = a.updateParentAttributes(dbCtx, *task.ParentTask, userObjectId)
				if err != nil {
					return nil, fmt.Errorf("failed to update parent attributes: %w", err)
				}
			}
		}

		return nil, nil
	})

	return err
}

func (a *MongoTaskActions) GetOpenTaskForModule(ctx context.Context, moduleID, userID string) ([]Task, error) {
	// Parse IDs to ObjectIDs
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}
	moduleObjectID, err := bson.ObjectIDFromHex(moduleID)
	if err != nil {
		return nil, ErrNoSuchModule
	}

	dbCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	count, err := a.CollectionModules.CountDocuments(dbCtx, bson.M{"_id": moduleObjectID, "userID": userObjectId})
	if err != nil {
		return nil, fmt.Errorf("failed to check if module exists: %w", err)
	}
	if count != 1 {
		return nil, ErrNoSuchModule
	}

	filter := bson.M{
		"moduleID":        moduleObjectID,
		"userID":          userObjectId,
		"status":          bson.M{"$lt": StatusCancelled},
		"isDeletedShadow": false,
		"isTemplate":      false,
		"parentTask":      nil,
	}

	tasks := []Task{}
	res, err := a.CollectionTasks.Find(dbCtx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch tasks: %w", err)
	}
	err = res.All(dbCtx, &tasks)
	if err != nil {
		return nil, fmt.Errorf("failed to decode tasks: %w", err)
	}

	return tasks, nil
}
