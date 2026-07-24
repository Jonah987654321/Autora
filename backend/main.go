package main

import (
	"autora-backend/config"
	"autora-backend/logger"
	"autora-backend/routing"
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const DB_CONNECTION_RETRIES = 5

func main() {
	// --- Register channel for interrupt signals to allow for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	// --- Init logger
	logger.Init()

	// --- Init config
	cfg, err := config.Init()
	if err != nil {
		slog.Error("Failed to init configuration", "error", err)
		os.Exit(1)
	}

	// --- MongoDB Setup
	slog.Info("Starting mongoDB connection")
	// Connection URI & client instance
	dbURI := fmt.Sprintf("mongodb://%v:%v@%v/%v", cfg.DBUserName, cfg.DBUserPassword, cfg.DBHost, cfg.DBName)
	client, err := mongo.Connect(options.Client().ApplyURI(dbURI))
	if err != nil {
		slog.Error("Failed to setup mongoDB", "error", err)
		os.Exit(1)
	}
	// Disconnection cleanup
	defer func() {
        if err := client.Disconnect(context.Background()); err != nil {
			slog.Error("Failed to disconnect mongoDB", "error", err)
        }
    }()
	// Connection health check
	for i := 1; i <= DB_CONNECTION_RETRIES; i++ {
		ctx, cancel := context.WithTimeout(context.Background(), 5 * time.Second)
		err = client.Ping(ctx, nil)
		cancel()
		if err == nil {
			break
		} else {
			slog.Warn("Failed to connect to mongoDB, retrying in 5sec", "attempt", i, "max_retries", DB_CONNECTION_RETRIES)
		}
		retry := time.After(5 * time.Second)
		select {
			case <-quit:
				slog.Info("Received interrupt, aborting mongoDB connection retries")
				return
			case <-retry:
				continue
		}
	}
	if err != nil {
		slog.Error("Failed to connect to mongoDB", "error", err)
		os.Exit(1)
	}
	slog.Info("Connection to mongoDB established")
	db := client.Database(cfg.DBName)

	router := routing.CreateRouter(db)
	server := http.Server{
		Addr: ":8080",
		Handler: router,
	}

	go func() {
		slog.Info("Starting webserver")
    	err = server.ListenAndServe()
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("Failed to start webserver", "error", err)
			os.Exit(1)
		}
	}()

	// --- Graceful shutdown
	// Wait for signal
	<-quit
	// Shutdown server
	ctx, cancel := context.WithTimeout(context.Background(), 10 * time.Second)
	defer cancel()
	slog.Info("Received interrupt, shutting down server")
	server.Shutdown(ctx)
}