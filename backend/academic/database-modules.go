package academic

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

const COLLECTION_MODULES = "modules"

var (
	ErrNoSuchModule = errors.New("modules: no matching module found")
)

type WeeklyScheduleEntry struct {
	Weekday int `bson:"weekday" json:"weekday"`
	Start   int `bson:"start" json:"start"`
	End     int `bson:"end" json:"end"`
	Type    int `bson:"type" json:"type"`
}

type Module struct {
	ID             bson.ObjectID         `bson:"_id,omitempty" json:"id"`
	UserID         bson.ObjectID         `bson:"userID" json:"-"`
	SemesterID     bson.ObjectID         `bson:"semesterID" json:"semesterID"`
	Name           string                `bson:"name" json:"name"`
	Abbreviation   string                `bson:"abbreviation" json:"abbreviation"`
	Color          string                `bson:"color" json:"color"`
	Ects           *int                  `bson:"ects,omitempty" json:"ects,omitempty"`
	Grade          *bson.Decimal128      `bson:"grade,omitempty" json:"grade,omitempty"`
	WeeklySchedule []WeeklyScheduleEntry `bson:"weeklySchedule,omitempty" json:"weeklySchedule,omitempty"`
}

type MongoModuleActions struct {
	Database *mongo.Database
}

func (a *MongoModuleActions) GetModulesForSemester(ctx context.Context, userID, semesterID string) ([]Module, error) {
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}
	semesterObjectID, err := bson.ObjectIDFromHex(semesterID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert semesterID to ObjectID: %w", err)
	}

	filter := bson.M{"userID": userObjectId, "semesterID": semesterObjectID}

	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	res, err := a.Database.Collection(COLLECTION_MODULES).Find(dbCtx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch from database: %w", err)
	}

	defer res.Close(ctx)

	data := []Module{}
	err = res.All(dbCtx, &data)
	if err != nil {
		return nil, fmt.Errorf("failed to decode results: %w", err)
	}

	return data, nil
}

func (a *MongoModuleActions) CreateModule(ctx context.Context, userID, semesterID string, req CreateModuleRequest) (*Module, error) {
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}
	semesterObjectID, err := bson.ObjectIDFromHex(semesterID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert semesterID to ObjectID: %w", err)
	}

	moduleID := bson.NewObjectID()
	newModule := Module{
		ID:           moduleID,
		UserID:       userObjectId,
		SemesterID:   semesterObjectID,
		Name:         req.Name,
		Abbreviation: req.Abbreviation,
		Color:        req.Color,
		Ects:         req.ECTS,
		Grade:        req.Grade,
	}

	dbCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()
	err = a.Database.Collection(COLLECTION_SEMESTERS).FindOne(dbCtx, bson.M{"_id": semesterObjectID, "userID": userObjectId}).Err()
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrNoSuchSemester
		}

		return nil, fmt.Errorf("failed to check if semester exists: %w", err)
	}
	_, err = a.Database.Collection(COLLECTION_MODULES).InsertOne(dbCtx, newModule)
	if err != nil {
		return nil, fmt.Errorf("failed to insert into database: %w", err)
	}

	return &newModule, nil
}

func (a *MongoModuleActions) GetModuleByID(ctx context.Context, userID, moduleID string) (*Module, error) {
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}
	moduleObjectId, err := bson.ObjectIDFromHex(moduleID)
	if err != nil {
		return nil, ErrNoSuchModule
	}

	var result Module

	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	err = a.Database.Collection(COLLECTION_MODULES).FindOne(dbCtx, bson.M{"_id": moduleObjectId, "userID": userObjectId}).Decode(&result)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrNoSuchModule
		}

		return nil, fmt.Errorf("failed to query database: %w", err)
	}

	return &result, nil
}

func (a *MongoModuleActions) EditModule(ctx context.Context, userID, moduleID string, req EditModuleRequest) (*Module, error) {
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}
	moduleObjectId, err := bson.ObjectIDFromHex(moduleID)
	if err != nil {
		return nil, ErrNoSuchModule
	}
	semesterObjectID, err := bson.ObjectIDFromHex(req.SemesterID)
	if err != nil {
		return nil, ErrNoSuchSemester
	}

	// --- Put together the update operation
	// Init filter
	filter := bson.M{
		"_id":    moduleObjectId,
		"userID": userObjectId,
	}
	// Required fields, always update
	setElements := bson.M{
		"semesterID":   semesterObjectID,
		"name":         req.Name,
		"abbreviation": req.Abbreviation,
		"color":        req.Color,
	}
	// Potentially unset empty, non-required fields
	unsetElements := bson.M{}
	// Check for the optional fields wether to set or unset them
	if req.ECTS != nil {
		setElements["ects"] = req.ECTS
	} else {
		unsetElements["ects"] = ""
	}
	if req.Grade != nil {
		setElements["grade"] = req.Grade
	} else {
		unsetElements["grade"] = ""
	}
	// Put it together into the update document
	updateOp := bson.M{
		"$set": setElements,
	}
	if len(unsetElements) > 0 {
		updateOp["$unset"] = unsetElements
	}

	// --- Prepare database context with timeout
	dbCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	// --- Validate semester exists
	err = a.Database.Collection(COLLECTION_SEMESTERS).FindOne(dbCtx, bson.M{"_id": semesterObjectID, "userID": userObjectId}).Err()
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrNoSuchSemester
		}

		return nil, fmt.Errorf("failed to check if semester exists: %w", err)
	}

	// --- Perform actual update
	res, err := a.Database.Collection(COLLECTION_MODULES).UpdateOne(dbCtx, filter, updateOp)
	if err != nil {
		return nil, fmt.Errorf("failed to update database: %w", err)
	}
	if res.MatchedCount == 0 {
		return nil, ErrNoSuchModule
	}

	return &Module{
		ID:           moduleObjectId,
		UserID:       userObjectId,
		SemesterID:   semesterObjectID,
		Name:         req.Name,
		Abbreviation: req.Abbreviation,
		Color:        req.Color,
		Ects:         req.ECTS,
		Grade:        req.Grade,
	}, nil
}

func (a *MongoModuleActions) SetWeeklySchedule(ctx context.Context, userID, moduleID string, req []WeeklyScheduleEntry) error {
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}
	moduleObjectId, err := bson.ObjectIDFromHex(moduleID)
	if err != nil {
		return ErrNoSuchModule
	}

	filter := bson.M{
        "_id":    moduleObjectId,
        "userID": userObjectId,
    }

    updateOp := bson.M{
        "$set": bson.M{
            "weeklySchedule": req,
        },
    }

	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
    defer cancel()

    res, err := a.Database.Collection(COLLECTION_MODULES).UpdateOne(dbCtx, filter, updateOp)
    if err != nil {
        return fmt.Errorf("failed to update weekly schedule: %w", err)
    }

	if res.MatchedCount == 0 {
        return ErrNoSuchModule
    }

	return nil
}
