package routing

import (
	"autora-backend/auth"
	"autora-backend/mw"
	"autora-backend/token"
	"net/http"

	"go.mongodb.org/mongo-driver/v2/mongo"
)

func CreateRouter(db *mongo.Database, jwtService *token.JWTService) *http.ServeMux {
	router := http.NewServeMux()

	// --- Everything that is not explicitly handled by other routes -> 404
	router.Handle("/", mw.CoreChain(http.NotFoundHandler()))

	// --- Authentication & user handling
	authDB := &auth.AuthActionsMongo{
		Database: db,
	}
	authService := auth.NewService(authDB, jwtService)
	refreshTokenTTL := int(jwtService.GetConfig().RefreshTokenTTL.Seconds())
	router.Handle("/auth/login", auth.NewLoginHandler(authService, refreshTokenTTL))
	router.Handle("/auth/signup", auth.NewSignupHandler(authService, refreshTokenTTL))
	router.Handle("/auth/refresh", auth.NewRefreshHandler(authService, refreshTokenTTL))
	router.Handle("/auth/logout", auth.NewLogoutHandler(authService, refreshTokenTTL))

	return router
}
