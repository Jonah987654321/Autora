package main

import (
	"autora-backend/config"
	"autora-backend/routing"
	"context"
	"errors"
	"fmt"
	"log"
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
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	// --- Init config
	cfg, err := config.Init()
	if err != nil {
		log.Fatalf("ERROR: Failed to init configuration: %v", err)
	}

	// --- MongoDB Setup
	log.Print("INFO: Starting mongoDB connection")
	// Connection URI & client instance
	dbURI := fmt.Sprintf("mongodb://%v:%v@%v/%v", cfg.DBUserName, cfg.DBUserPassword, cfg.DBHost, cfg.DBName)
	client, err := mongo.Connect(options.Client().ApplyURI(dbURI))
	if err != nil {
		log.Fatalf("ERROR: Failed to setup mongoDB: %v", err)
	}
	// Disconnection cleanup
	defer func() {
        if err := client.Disconnect(context.Background()); err != nil {
            log.Printf("ERROR: Failed to disconnect mongoDB: %v", err)
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
			log.Printf("WARN: %v/%v Failed to connect to mongoDB, retrying in 5sec", i, DB_CONNECTION_RETRIES)
		}
		time.Sleep(5 * time.Second)
	}
	if err != nil {
		log.Fatalf("ERROR: Failed to connect to mongoDB: %v", err)
	}
	log.Print("INFO: Connection to mongoDB established")
	db := client.Database(cfg.DBName)

	router := routing.CreateRouter(db)
	server := http.Server{
		Addr: ":8080",
		Handler: router,
	}

	go func() {
		log.Print("INFO: Starting webserver")
    	err = server.ListenAndServe()
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("ERROR: Failed to start webserver: %v", err)
		}
	}()

	// --- Graceful shutdown
	// Wait for signal
	<-c
	// Shutdown server
	ctx, cancel := context.WithTimeout(context.Background(), 10 * time.Second)
	defer cancel()
	log.Print("INFO: Received interrupt, shutting down server")
	server.Shutdown(ctx)
}