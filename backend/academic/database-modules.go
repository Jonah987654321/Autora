package academic

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

const COLLECTION_MODULES = "modules"

type Module struct {
	ID         bson.ObjectID   `bson:"_id,omitempty" json:"id"`
	UserID     bson.ObjectID   `bson:"userID" json:"-"`
	SemesterID bson.ObjectID   `bson:"semesterID" json:"semesterID"`
	Name       string          `bson:"name" json:"name"`
	Color      string          `bson:"color" json:"color"`
	Ects       int             `bson:"ects,omitempty" json:"ects,omitempty"`
	Grade      bson.Decimal128 `bson:"grade,omitempty" json:"grade,omitempty"`
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
