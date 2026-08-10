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

type Module struct {
	ID           bson.ObjectID    `bson:"_id,omitempty" json:"id"`
	UserID       bson.ObjectID    `bson:"userID" json:"-"`
	SemesterID   bson.ObjectID    `bson:"semesterID" json:"semesterID"`
	Name         string           `bson:"name" json:"name"`
	Abbreviation string           `bson:"abbreviation" json:"abbreviation"`
	Color        string           `bson:"color" json:"color"`
	Ects         *int             `bson:"ects,omitempty" json:"ects,omitempty"`
	Grade        *bson.Decimal128 `bson:"grade,omitempty" json:"grade,omitempty"`
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
