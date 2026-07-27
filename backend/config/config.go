package config

import (
	"errors"
	"os"

	"github.com/joho/godotenv"
)

type Database struct {
	Name         string
	UserName     string
	UserPassword string
	Host         string
}

type JWT struct {
	AccessSecret  []byte
	RefreshSecret []byte
}

type Data struct {
	// --- General App
	AppEnvironment string
	AppDomain      string

	DB  Database
	Jwt JWT
}

func Init() (*Data, error) {
	// --- Load env file for running without docker
	// If it is missing, we can just discard the error
	// because docker most probably already injected the vars
	_ = godotenv.Load("../.env")

	// --- Env variable parsing & validation
	// General App Configuration
	appEnv := os.Getenv("APP_ENV")
	if appEnv != "development" && appEnv != "production" {
		return nil, errors.New("APP_ENV is missing or not a valid value")
	}
	appDomain := os.Getenv("APP_DOMAIN")
	if appDomain == "" {
		return nil, errors.New("APP_DOMAIN is not set")
	}
	// MongoDB configuration
	dbHost := os.Getenv("MONGO_HOST")
	dbDBName := os.Getenv("MONGO_DATABASE_NAME")
	dbUserName := os.Getenv("MONGO_USER_NAME")
	dbUserPwd := os.Getenv("MONGO_USER_PWD")
	if dbHost == "" || dbDBName == "" || dbUserName == "" || dbUserPwd == "" {
		return nil, errors.New("Some or all mongoDB config parameters are missing")
	}
	// JWT configuration
	accessSecret := os.Getenv("JWT_ACCESS_SECRET")
	refreshSecret := os.Getenv("JWT_REFRESH_SECRET")
	if len(accessSecret) < 32 || len(refreshSecret) < 32 {
		return nil, errors.New("JWT secrets must be at least 32 characters")
	}

	dbData := Database{
		Name:         dbDBName,
		UserName:     dbUserName,
		UserPassword: dbUserPwd,
		Host:         dbHost,
	}
	jwtData := JWT{
		AccessSecret:  []byte(accessSecret),
		RefreshSecret: []byte(refreshSecret),
	}

	parsedData := Data{
		AppEnvironment: appEnv,
		AppDomain:      appDomain,
		DB:             dbData,
		Jwt:            jwtData,
	}

	return &parsedData, nil
}
