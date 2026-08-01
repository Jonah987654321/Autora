package academic

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

const COLLECTION_SEMESTERS = "semesters"

type Semester struct {
	ID        bson.ObjectID `bson:"_id" json:"id"`
	UserID    bson.ObjectID `bson:"userID" json:"-"`
	Name      string        `bson:"name" json:"name"`
	StartDate JBsonTime     `bson:"startDate" json:"startDate"`
	EndDate   JBsonTime     `bson:"endDate" json:"endDate"`
}

type MongoAcademicActions struct {
	Database *mongo.Database
}

var (
	ErrSemesterOverlapping = errors.New("semesters cannot overlap")
	ErrNoSuchSemester      = errors.New("no matching semester")
)

func (a *MongoAcademicActions) doesSemesterOverlap(ctx context.Context, userID bson.ObjectID, start, end time.Time) (bool, error) {
	findOverlapping := bson.M{"$and": bson.A{
		bson.M{"userID": userID},
		bson.M{"startDate": bson.M{"$lte": end}},
		bson.M{"endDate": bson.M{"$gte": start}},
	}}

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

func (a *MongoAcademicActions) CreateSemester(ctx context.Context, userID string, data CreateSemesterRequest) (string, error) {
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return "", fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}

	overlapping, err := a.doesSemesterOverlap(ctx, userObjectId, data.StartDate.Time, data.EndDate.Time)
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

func (a *MongoAcademicActions) GetAllSemesters(ctx context.Context, userID string) ([]Semester, error) {
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}

	filter := bson.M{"userID": userObjectId}

	dbCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()
	res, err := a.Database.Collection(COLLECTION_SEMESTERS).Find(dbCtx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch from database: %w", err)
	}

	defer res.Close(dbCtx)

	data := []Semester{}
	err = res.All(dbCtx, &data)
	if err != nil {
		return nil, fmt.Errorf("failed to decode results: %w", err)
	}

	return data, nil
}

func (a *MongoAcademicActions) GetActiveSemester(ctx context.Context, userID string) (*Semester, error) {
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

func (a *MongoAcademicActions) GetSemesterByID(ctx context.Context, userID, semesterID string) (*Semester, error) {
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
