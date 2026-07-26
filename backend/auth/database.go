package auth

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

var ErrInvalidCredentials = errors.New("auth: invalid credentials")
var ErrEmailAlreadyExisting = errors.New("auth: email already registered")

type LoginDataDB struct {
    Email        string `bson:"email"`
    PasswordHash string `bson:"password"`
}

type AuthActionsMongo struct {
	Database *mongo.Database
}
func (a *AuthActionsMongo) Login(ctx context.Context, data LoginData) (string, error){
	// --- Query database for user with given email
	var user LoginDataDB
	filter := bson.M{"email": data.Email}
	err := a.Database.Collection("userData").FindOne(ctx, filter).Decode(&user)

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
	return "", nil
}
