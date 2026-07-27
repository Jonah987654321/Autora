package main

import (
	"autora-backend/config"
	"autora-backend/database"
	"autora-backend/logger"
	"autora-backend/routing"
	"autora-backend/token"
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

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
	dbClient, err := database.Init(cfg.DB, quit)
	if err != nil {
		if errors.Is(err, database.ErrConnectingInterrupted) {
			slog.Info("Received interrupt, aborting mongoDB connection retries")
			return
		}

		slog.Error("Failed to establish connection to mongoDB", "error", err)
		os.Exit(1)
	}
	db := dbClient.Database(cfg.DB.Name)
	// Disconnect cleanup
	defer database.Disconnect(dbClient)
	// Indices setup
	slog.Info("Setting up indices")
	err = database.SetupIndices(db)
	if err != nil {
		slog.Error("Indices setup failed", " error", err)
		os.Exit(1)
	}
	slog.Info("Connection to mongoDB established")

	// ---JWT setup
	jwtConfig := token.GenerateConfig(cfg.Jwt.AccessSecret, cfg.Jwt.RefreshSecret)
	jwtStore := token.NewTokenStore(db)
	jwtService := token.NewJWTService(jwtConfig, jwtStore)

	// --- Router config & start
	// Get the router with routes
	router := routing.CreateRouter(db, &jwtService)
	server := http.Server{
		Addr:    ":8080",
		Handler: router,
	}
	// start it async to not block the main thread
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
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	slog.Info("Received interrupt, shutting down server")
	server.Shutdown(ctx)
}
