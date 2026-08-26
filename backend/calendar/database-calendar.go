package calendar

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

// --- Basic definitions
// Database entry structure
type Event struct {
	ID          bson.ObjectID  `bson:"_id,omitempty" json:"id"`
	UserID      bson.ObjectID  `bson:"userID" json:"-"`
	ModuleID    *bson.ObjectID `bson:"moduleID,omitempty" json:"moduleID,omitempty"`
	Title       string         `bson:"title" json:"title"`
	Description string         `bson:"description" json:"description"`
	Start       time.Time      `bson:"start" json:"start"`
	End         time.Time      `bson:"end" json:"end"`
	Type        int            `bson:"type" json:"type"`
}

// Errors
var (
	ErrNoSuchModule = errors.New("calendar: no matching module found")
	ErrNoSuchEvent  = errors.New("calendar: no matching event found")
)

// Struct for providing database functions
type CalendarActionsMongo struct {
	CollectionCalendar *mongo.Collection
	CollectionModules  *mongo.Collection
}

func (a *CalendarActionsMongo) TruncateTimespan(req EventRequest) EventRequest {
	// Start and end are truncated to millisecond as mongo Date does not store nanosecond precision
	req.Start = req.Start.Truncate(time.Millisecond)
	req.End = req.End.Truncate(time.Millisecond)
	return req
}

func (a *CalendarActionsMongo) CreateEvent(ctx context.Context, userID string, req EventRequest) (*Event, error) {
	req = a.TruncateTimespan(req)

	// --- Parse IDs to ObjectIDs
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}
	var moduleObjectID *bson.ObjectID
	if req.ModuleID == "" {
		moduleObjectID = nil
	} else {
		parsedID, err := bson.ObjectIDFromHex(req.ModuleID)
		if err != nil {
			return nil, ErrNoSuchModule
		}
		moduleObjectID = &parsedID
	}

	// --- Init context and set timeout
	dbCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	// --- Validate module exists if not empty
	if moduleObjectID != nil {
		err = a.CollectionModules.FindOne(dbCtx, bson.M{"_id": moduleObjectID, "userID": userObjectId}).Err()
		if err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				return nil, ErrNoSuchModule
			}

			return nil, fmt.Errorf("failed to check if module exists: %w", err)
		}
	}

	// --- Insert the new event into the database
	// Compose new entry
	createdID := bson.NewObjectID()
	createdEvent := Event{
		ID:          createdID,
		UserID:      userObjectId,
		ModuleID:    moduleObjectID,
		Title:       req.Title,
		Description: req.Description,
		Start:       req.Start,
		End:         req.End,
		Type:        req.Type,
	}
	// Write it into database
	_, err = a.CollectionCalendar.InsertOne(dbCtx, createdEvent)
	if err != nil {
		return nil, fmt.Errorf("failed to insert new event: %w", err)
	}

	return &createdEvent, nil
}

func (a *CalendarActionsMongo) UpdateEvent(ctx context.Context, userID, eventID string, req EventRequest) (*Event, error) {
	req = a.TruncateTimespan(req)

	// --- Parse IDs to ObjectIDs
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}
	eventObjectId, err := bson.ObjectIDFromHex(eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert eventID to ObjectID: %w", err)
	}
	var moduleObjectID *bson.ObjectID
	if req.ModuleID == "" {
		moduleObjectID = nil
	} else {
		parsedID, err := bson.ObjectIDFromHex(req.ModuleID)
		if err != nil {
			return nil, ErrNoSuchModule
		}
		moduleObjectID = &parsedID
	}

	// --- Compose update
	// Define filter so we only update the correct event and ensure it belongs to the user
	filter := bson.M{"_id": eventObjectId, "userID": userObjectId}
	updateOp := bson.M{}
	// Keys to always update
	setElements := bson.M{
		"title":       req.Title,
		"description": req.Description,
		"start":       req.Start,
		"end":         req.End,
		"type":        req.Type,
	}
	unsetElements := bson.M{}
	// Differentiate between setting and unsetting for the module
	if moduleObjectID != nil {
		setElements["moduleID"] = moduleObjectID
	} else {
		unsetElements["moduleID"] = ""
	}
	// Now define $set and $unset keys for the update
	updateOp["$set"] = setElements
	if len(unsetElements) > 0 {
		updateOp["$unset"] = unsetElements
	}

	// --- Init context and set timeout
	dbCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	// --- Validate module exists if not empty
	if moduleObjectID != nil {
		err = a.CollectionModules.FindOne(dbCtx, bson.M{"_id": moduleObjectID, "userID": userObjectId}).Err()
		if err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				return nil, ErrNoSuchModule
			}

			return nil, fmt.Errorf("failed to check if module exists: %w", err)
		}
	}

	res, err := a.CollectionCalendar.UpdateOne(dbCtx, filter, updateOp)
	if err != nil {
		return nil, fmt.Errorf("failed to update database: %w", err)
	}
	if res.MatchedCount == 0 {
		return nil, ErrNoSuchEvent
	}

	return &Event{
		ID:          eventObjectId,
		UserID:      userObjectId,
		ModuleID:    moduleObjectID,
		Title:       req.Title,
		Description: req.Description,
		Start:       req.Start,
		End:         req.End,
		Type:        req.Type,
	}, nil
}

func (a *CalendarActionsMongo) DeleteEvent(ctx context.Context, userID, eventID string) error {
	// --- Parse IDs to ObjectIDs
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}
	eventObjectId, err := bson.ObjectIDFromHex(eventID)
	if err != nil {
		return fmt.Errorf("failed to convert eventID to ObjectID: %w", err)
	}

	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	res, err := a.CollectionCalendar.DeleteOne(dbCtx, bson.M{"_id": eventObjectId, "userID": userObjectId})
	if err != nil {
		return fmt.Errorf("failed to delete from database: %w", err)
	}
	if res.DeletedCount == 0 {
		return ErrNoSuchEvent
	}
	return nil
}

func (a *CalendarActionsMongo) GetUpcomingEventsForModule(ctx context.Context, userID, moduleID string) ([]Event, error) {
	// --- Parse IDs to ObjectIDs
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}
	moduleObjectID, err := bson.ObjectIDFromHex(moduleID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert moduleID to ObjectID: %w", err)
	}

	filter := bson.M{
		"userID":   userObjectId,
		"moduleID": moduleObjectID,
		"end": bson.M{
			"$gte": time.Now().Truncate(time.Millisecond),
		},
	}

	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	res, err := a.CollectionCalendar.Find(dbCtx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get events from calendar: %w", err)
	}

	events := []Event{}
	err = res.All(dbCtx, &events)
	if err != nil {
		return nil, fmt.Errorf("failed to decode event results: %w", err)
	}

	return events, nil
}
