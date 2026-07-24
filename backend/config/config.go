package config

import (
	"errors"
	"os"

	"github.com/joho/godotenv"
)

type Data struct {
	// --- General App
	AppEnvironment string

	// --- Database
	DBName string
	DBUserName string
	DBUserPassword string
	DBHost string
}

func Init() (Data, error) {
	// --- Load env file for running without docker
	// If it is missing, we can just discard the error
	// because docker most probably already injected the vars
	_ = godotenv.Load("../.env")

	// --- Env variable parsing & validation
	// General App Configuration
	appEnv := os.Getenv("APP_ENV")
	if (appEnv == "" || (appEnv != "development" && appEnv != "production")) {
		return Data{}, errors.New("APP_ENV is missing or not a valid value")
	}
	// MongoDB configuration
	dbHost := os.Getenv("MONGO_HOST")
	dbDBName := os.Getenv("MONGO_DATABASE_NAME")
	dbUserName := os.Getenv("MONGO_USER_NAME")
	dbUserPwd := os.Getenv("MONGO_USER_PWD")
	if (dbHost == "" || dbDBName == "" || dbUserName == "" || dbUserPwd == "") {
		return Data{}, errors.New("Some or all mongoDB config parameters are missing")
	}

	parsedData := Data{
		AppEnvironment: appEnv,
		
		DBName: dbDBName,
		DBUserName: dbUserName,
		DBUserPassword: dbUserPwd,
		DBHost: dbHost,
	}

	return parsedData, nil
}
