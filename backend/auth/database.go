package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

const COLLECTION = "users"

var ErrInvalidCredentials = errors.New("auth: invalid credentials")
var ErrEmailAlreadyExisting = errors.New("auth: email already registered")

type RetrievedLogin struct {
	UserID       bson.ObjectID `bson:"_id"`
	Email        string        `bson:"email"`
	PasswordHash string        `bson:"password"`
}
type InsertSignup struct {
	UserID       bson.ObjectID `bson:"_id"`
	Email        string        `bson:"email"`
	PasswordHash string        `bson:"password"`
	FullName     string        `bson:"fullName"`
}

type AuthActionsMongo struct {
	Database *mongo.Database
}

func (a *AuthActionsMongo) Login(ctx context.Context, data LoginData) (string, error) {
	// --- Query database for user with given email
	var user RetrievedLogin
	filter := bson.M{"email": data.Email}
	// Set a timeout for the database operation
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	err := a.Database.Collection(COLLECTION).FindOne(ctx, filter).Decode(&user)

	// --- Possible error handling
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			// No user found with given email
			return "", ErrInvalidCredentials
		}

		return "", fmt.Errorf("database select failed: %w", err)
	}

	if !VerifyPassword(data.Password, user.PasswordHash) {
		return "", ErrInvalidCredentials
	}

	return user.UserID.Hex(), nil
}

func (a *AuthActionsMongo) Signup(ctx context.Context, data SignupData) (string, error) {
	// Hash the password first
	hash, err := HashPassword(data.Password)
	if err != nil {
		return "", err
	}

	userID := bson.NewObjectID()
	insert := InsertSignup{
		UserID:       userID,
		Email:        data.Email,
		PasswordHash: hash,
		FullName:     data.FullName,
	}

	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	_, err = a.Database.Collection(COLLECTION).InsertOne(ctx, insert)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return "", ErrEmailAlreadyExisting
		}

		return "", fmt.Errorf("database insert failed: %w", err)
	}

	return userID.Hex(), nil
}

func (a *AuthActionsMongo) VerifyUserID(ctx context.Context, id string) (bool, error) {
	userObjectId, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return false, fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}

	filter := bson.M{"_id": userObjectId}

	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	err = a.Database.Collection(COLLECTION).FindOne(dbCtx, filter).Err()
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return false, nil
		}

		return false, fmt.Errorf("database query to findOne failed: %w", err)
	}

	return true, nil
}
