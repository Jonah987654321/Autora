package token

import (
	"github.com/golang-jwt/jwt/v5"
)

type CustomClaims struct {
	jwt.RegisteredClaims
	UserID       string `json:"userID"`
	TokenType    string `json:"tokenType"`
	TokenVersion int    `json:"tokenVersion"`
}

type TokenPair struct {
	AccessToken  string
	RefreshToken string
}
