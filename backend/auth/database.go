package auth

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

const COLLECTION = "users"

var ErrInvalidCredentials = errors.New("auth: invalid credentials")
var ErrEmailAlreadyExisting = errors.New("auth: email already registered")

type RetrievedLogin struct {
    Email        string `bson:"email"`
    PasswordHash string `bson:"password"`
}
type InsertSignup struct {
	UserID			bson.ObjectID `bson:"userID"`
	Email        	string `bson:"email"`
    PasswordHash 	string `bson:"password"`
	FullName	 	string `bson:"fullName"`
}

type AuthActionsMongo struct {
	Database *mongo.Database
}
func (a *AuthActionsMongo) Login(ctx context.Context, data LoginData) (string, error){
	// --- Query database for user with given email
	var user RetrievedLogin
	filter := bson.M{"email": data.Email}
	// Set a timeout for the database operation
	ctx, cancel := context.WithTimeout(ctx, 2 * time.Second)
	defer cancel()
	err := a.Database.Collection(COLLECTION).FindOne(ctx, filter).Decode(&user)

	// --- Possible error handling
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			// No user found with given email
			return "", ErrInvalidCredentials
		}

		return "", err
	}

	if (!VerifyPassword(data.Password, user.PasswordHash)) {
		return "", ErrInvalidCredentials
	}

	return "jwt-token", nil
}

func (a *AuthActionsMongo) Signup(ctx context.Context, data SignupData) (string, error) {
	// Hash the password first
	hash, err := HashPassword(data.Password)
	if err != nil {
		return "", err
	}

	userID := bson.NewObjectID()
	insert := InsertSignup{
		UserID: userID,
		Email: data.Email,
		PasswordHash: hash,
		FullName: data.FullName,
	}

	ctx, cancel := context.WithTimeout(ctx, 2 * time.Second)
	defer cancel()
	_, err = a.Database.Collection(COLLECTION).InsertOne(ctx, insert)
	if err != nil {
		// --- Error check
		// Check wether the exception contains a Write Error 11000
		// which means duplicate key => email already registered
		var mongoErr mongo.WriteException
		if errors.As(err, &mongoErr) {
			for _, e := range mongoErr.WriteErrors {
				if e.Code == 11000 {
					return "", ErrEmailAlreadyExisting
				}
			}
		}

		return "", err
	}

	return "jwt-token", nil
}
