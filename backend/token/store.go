package token

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// --- Structure for the database
type UserStore struct {
	UserID        bson.ObjectID `bson:"_id"`
	TokenVersion  int           `bson:"tokenVersion"`
	RefreshTokens []string      `bson:"refreshTokens"`
}

func NewTokenStore(collection *mongo.Collection) TokenStore {
	return TokenStore{
		Collection: collection,
	}
}

type TokenStore struct {
	Collection *mongo.Collection
}

func (ts *TokenStore) createUserStore(ctx context.Context, userID bson.ObjectID) (UserStore, error) {
	data := UserStore{
		UserID:        userID,
		TokenVersion:  0,
		RefreshTokens: []string{},
	}

	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	_, err := ts.Collection.InsertOne(dbCtx, data)
	if err != nil {
		return UserStore{}, fmt.Errorf("error on writing to database: %w", err)
	}
	return data, nil
}

func (ts *TokenStore) getUserStore(ctx context.Context, userID bson.ObjectID) (UserStore, error) {
	var userData UserStore
	filter := bson.M{"_id": userID}

	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	err := ts.Collection.FindOne(dbCtx, filter).Decode(&userData)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			res, err := ts.createUserStore(ctx, userID)
			if err != nil {
				return UserStore{}, fmt.Errorf("user token store did not exist, creating it failed: %w", err)
			}

			return res, nil
		}

		return UserStore{}, fmt.Errorf("fetching user token store failed: %w", err)
	}

	return userData, nil
}

func (ts *TokenStore) GetUserTokenVersion(ctx context.Context, userID string) (int, error) {
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return 0, fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}

	userData, err := ts.getUserStore(ctx, userObjectId)
	if err != nil {
		return 0, fmt.Errorf("failed to get user token store: %w", err)
	}

	return userData.TokenVersion, nil
}

func (ts *TokenStore) StoreRefreshToken(ctx context.Context, tokenID, userID string) error {
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}

	// Insert new token, but limit existing tokens to 5
	updateOp := bson.M{
		"$setOnInsert": bson.M{
			"tokenVersion": 0,
		},
		"$push": bson.M{
			"refreshTokens": bson.M{
				"$each":  []string{tokenID},
				"$slice": -5,
			},
		},
	}
	options := options.UpdateOne().SetUpsert(true)

	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	_, err = ts.Collection.UpdateByID(dbCtx, userObjectId, updateOp, options)

	if err != nil {
		return fmt.Errorf("failed to insert new token: %w", err)
	}

	return nil
}

func (ts *TokenStore) IsRefreshTokenValid(ctx context.Context, tokenID string) (bool, error) {
	filter := bson.M{"refreshTokens": tokenID}

	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	err := ts.Collection.FindOne(dbCtx, filter).Err()
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return false, nil
		}

		return false, fmt.Errorf("error on database query: %w", err)
	}
	return true, nil
}

func (ts *TokenStore) RevokeRefreshToken(ctx context.Context, tokenID string) error {
	updateOp := bson.M{
		"$pull": bson.M{
			"refreshTokens": tokenID,
		},
	}
	filter := bson.M{"refreshTokens": tokenID}

	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	_, err := ts.Collection.UpdateOne(dbCtx, filter, updateOp)
	if err != nil {
		return fmt.Errorf("removing token from database failed: %w", err)
	}
	return nil
}

func (ts *TokenStore) IncrementUserTokenVersion(ctx context.Context, userID string) error {
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}

	updateOp := bson.M{
		"$inc": bson.M{
			"tokenVersion": 1,
		},
	}

	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	_, err = ts.Collection.UpdateByID(dbCtx, userObjectId, updateOp)
	if err != nil {
		return fmt.Errorf("database update failed: %w", err)
	}

	return nil
}

func (ts *TokenStore) RevokeAllRefreshTokens(ctx context.Context, userID string) error {
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}

	updateOp := bson.M{
		"$set": bson.M{
			"refreshTokens": []string{},
		},
	}

	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	_, err = ts.Collection.UpdateByID(dbCtx, userObjectId, updateOp)
	if err != nil {
		return fmt.Errorf("database update failed: %w", err)
	}

	return nil
}
