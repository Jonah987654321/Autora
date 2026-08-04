package academic

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const COLLECTION_SEMESTERS = "semesters"

type Semester struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    bson.ObjectID `bson:"userID" json:"-"`
	Name      string        `bson:"name" json:"name"`
	StartDate JBsonTime     `bson:"startDate" json:"startDate"`
	EndDate   JBsonTime     `bson:"endDate" json:"endDate"`
}

type MongoSemesterActions struct {
	Database *mongo.Database
}

var (
	ErrSemesterOverlapping = errors.New("semesters cannot overlap")
	ErrNoSuchSemester      = errors.New("no matching semester")
)

func (a *MongoSemesterActions) doesSemesterOverlap(ctx context.Context, userID bson.ObjectID, start, end time.Time, exclude *bson.ObjectID) (bool, error) {
	findOverlapping := bson.M{"$and": bson.A{
		bson.M{"userID": userID},
		bson.M{"startDate": bson.M{"$lte": end}},
		bson.M{"endDate": bson.M{"$gte": start}},
	}}

	if exclude != nil {
        findOverlapping["_id"] = bson.M{"$ne": *exclude}
    }

	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	err := a.Database.Collection(COLLECTION_SEMESTERS).FindOne(dbCtx, findOverlapping).Err()
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return false, nil
		}

		return false, fmt.Errorf("failed to query database: %w", err)
	}

	return true, nil
}

func (a *MongoSemesterActions) CreateSemester(ctx context.Context, userID string, data CreateSemesterRequest) (string, error) {
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return "", fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}

	overlapping, err := a.doesSemesterOverlap(ctx, userObjectId, data.StartDate.Time, data.EndDate.Time, nil)
	if err != nil {
		return "", fmt.Errorf("failed to check for overlapping semesters: %w", err)
	}
	if overlapping {
		return "", ErrSemesterOverlapping
	}

	semesterID := bson.NewObjectID()
	insertData := Semester{
		ID:        semesterID,
		UserID:    userObjectId,
		Name:      data.Name,
		StartDate: data.StartDate,
		EndDate:   data.EndDate,
	}

	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	_, err = a.Database.Collection(COLLECTION_SEMESTERS).InsertOne(dbCtx, insertData)
	if err != nil {
		return "", fmt.Errorf("failed to insert into database: %w", err)
	}

	return semesterID.Hex(), nil
}

func (a *MongoSemesterActions) GetAllSemesters(ctx context.Context, userID string) ([]Semester, error) {
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}

	filter := bson.M{"userID": userObjectId}
	findOptions := options.Find().SetSort(bson.D{{Key: "startDate", Value: -1}})

	dbCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()
	res, err := a.Database.Collection(COLLECTION_SEMESTERS).Find(dbCtx, filter, findOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch from database: %w", err)
	}

	defer res.Close(ctx)

	data := []Semester{}
	err = res.All(dbCtx, &data)
	if err != nil {
		return nil, fmt.Errorf("failed to decode results: %w", err)
	}

	return data, nil
}

func (a *MongoSemesterActions) GetActiveSemester(ctx context.Context, userID string) (*Semester, error) {
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}

	now := time.Now()

	filter := bson.M{
		"userID": userObjectId,
		"startDate": bson.M{
			"$lte": now,
		},
		"endDate": bson.M{
			"$gte": now,
		},
	}

	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	var current Semester
	err = a.Database.Collection(COLLECTION_SEMESTERS).FindOne(dbCtx, filter).Decode(&current)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}

		return nil, fmt.Errorf("failed to query/decode semester: %w", err)
	}
	return &current, nil
}

func (a *MongoSemesterActions) GetSemesterByID(ctx context.Context, userID, semesterID string) (*Semester, error) {
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}
	semesterObjectID, err := bson.ObjectIDFromHex(semesterID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert semesterID to ObjectID: %w", err)
	}

	filter := bson.M{
		"_id":    semesterObjectID,
		"userID": userObjectId,
	}
	var semester Semester

	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	err = a.Database.Collection(COLLECTION_SEMESTERS).FindOne(dbCtx, filter).Decode(&semester)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrNoSuchSemester
		}

		return nil, fmt.Errorf("failed to query/decode semester: %w", err)
	}

	return &semester, nil
}

func (a *MongoSemesterActions) EditSemester(ctx context.Context, userID, semesterID string, data EditSemesterRequest) (*Semester, error) {
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}
	semesterObjectID, err := bson.ObjectIDFromHex(semesterID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert semesterID to ObjectID: %w", err)
	}

	overlapping, err := a.doesSemesterOverlap(ctx, userObjectId, data.StartDate.Time, data.EndDate.Time, &semesterObjectID)
	if err != nil {
		return nil, fmt.Errorf("failed to check for overlapping semesters: %w", err)
	}
	if overlapping {
		return nil, ErrSemesterOverlapping
	}

	filter := bson.M{
		"_id":    semesterObjectID,
		"userID": userObjectId,
	}
	updateOp := bson.M{
		"$set": bson.M{
			"name":      data.Name,
			"startDate": data.StartDate,
			"endDate":   data.EndDate,
		},
	}

	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	res, err := a.Database.Collection(COLLECTION_SEMESTERS).UpdateOne(dbCtx, filter, updateOp)
	if err != nil {
		return nil, fmt.Errorf("Failed to update database: %w", err)
	}
	if res.MatchedCount == 0 {
		return nil, ErrNoSuchSemester
	}

	return &Semester{
		ID:        semesterObjectID,
		UserID:    userObjectId,
		Name:      data.Name,
		StartDate: data.StartDate,
		EndDate:   data.EndDate,
	}, nil
}
