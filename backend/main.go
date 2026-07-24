package main

import (
	"autora-backend/routing"
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const DB_CONNECTION_RETRIES = 5

func main() {

	// --- Load env file for running without docker
	// If it is missing, we can just discard the error
	// because docker most probably already injected the vars
	_ = godotenv.Load("../.env")

	log.Print("INFO: Starting mongoDB connection")

	// --- Env variable parsing & validation
	dbHost := os.Getenv("MONGO_HOST_URI")
	dbDBName := os.Getenv("MONGO_DATABASE_NAME")
	dbUserName := os.Getenv("MONGO_USER_NAME")
	dbUserPwd := os.Getenv("MONGO_USER_PWD")
	if (dbHost == "" || dbDBName == "" || dbUserName == "" || dbUserPwd == "") {
		log.Fatal("ERROR: Environment is missing at least one mongodb configuration key. Check .env.example for all keys needed")
	}

	// --- MongoDB Setup
	// Connection URI & client instance
	dbURI := fmt.Sprintf("mongodb://%v:%v@%v/%v", dbUserName, dbUserPwd, dbHost, dbDBName)
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

	// --- Connection health check
	for i := 1; i <= DB_CONNECTION_RETRIES; i++ {
		ctx, cancel := context.WithTimeout(context.Background(), 5 * time.Second)
		err = client.Ping(ctx, nil)
		cancel()
		if err == nil {
			break
		} else {
			log.Printf("WARNING: %v/%v Failed to connect to mongoDB, retrying in 5sec", i, DB_CONNECTION_RETRIES)
		}
		time.Sleep(5 * time.Second)
	}
	if err != nil {
		log.Fatalf("ERROR: Failed to connect to mongoDB: %v", err)
	}
	log.Print("INFO: Connection to mongoDB established")

	db := client.Database(dbDBName)

	router := routing.CreateRouter(db)

	log.Print("INFO: Starting webserver")
    err = http.ListenAndServe(":8080", router)
	if err != nil {
		log.Fatalf("ERROR: Failed to start webserver: %v", err)
	}
}