package routing

import (
	"autora-backend/academic"
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
	router.Handle("POST /auth/login", auth.NewLoginHandler(authService, refreshTokenTTL))
	router.Handle("POST /auth/signup", auth.NewSignupHandler(authService, refreshTokenTTL))
	router.Handle("POST /auth/refresh", auth.NewRefreshHandler(authService, refreshTokenTTL))
	router.Handle("POST /auth/logout", auth.NewLogoutHandler(authService, refreshTokenTTL))

	// --- Auth middleware -> only authenticated users
	authMW := token.AuthMiddleware(jwtService)

	// --- Semester-related routes
	academicsDB := &academic.MongoAcademicActions{
		Database: db,
	}
	router.Handle("POST /academic/semesters", academic.NewCreateSemesterHandler(authMW, academicsDB))
	router.Handle("GET /academic/semesters", academic.NewGetAllSemestersHandler(authMW, academicsDB))
	router.Handle("GET /academic/semesters/active", academic.NewGetActiveSemesterHandler(authMW, academicsDB))
	router.Handle("GET /academic/semesters/{id}", academic.NewGetSemesterByIDHandler(authMW, academicsDB))

	return router
}
