package database

import (
	"autora-backend/config"
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const CONNECTION_RETRIES = 5

var ErrConnectingInterrupted = errors.New("interrupt while establishing connection")

func Init(cfg config.Database, quit <-chan os.Signal) (*mongo.Client, error) {
	// Connection URI & client instance
	dbURI := fmt.Sprintf("mongodb://%v:%v@%v/%v", cfg.UserName, cfg.UserPassword, cfg.Host, cfg.Name)
	client, err := mongo.Connect(options.Client().ApplyURI(dbURI))
	if err != nil {
		return nil, err
	}
	// Connection health check
	for i := 1; i <= CONNECTION_RETRIES; i++ {
		ctx, cancel := context.WithTimeout(context.Background(), 5 * time.Second)
		err = client.Ping(ctx, nil)
		cancel()
		if err == nil {
			break
		} else {
			slog.Warn("Failed to connect to mongoDB, retrying in 5sec", "attempt", i, "max_retries", CONNECTION_RETRIES)
		}
		retry := time.After(5 * time.Second)
		select {
			case <-quit:
				Disconnect(client)
				return nil, ErrConnectingInterrupted
			case <-retry:
				continue
		}
	}
	if err != nil {
		Disconnect(client)
		return nil, err
	}
	return client, nil
}

func Disconnect(client *mongo.Client) {
	ctx, cancel := context.WithTimeout(context.Background(), 5 * time.Second)
	defer cancel()
	err := client.Disconnect(ctx)
	if err != nil {
		slog.Error("Failed to disconnect mongoDB", "error", err)
	}
}
