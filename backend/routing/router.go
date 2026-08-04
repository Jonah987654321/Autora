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
	semestersDB := &academic.MongoSemesterActions{
		Database: db,
	}
	router.Handle("POST /academic/semesters", academic.NewCreateSemesterHandler(authMW, semestersDB))
	router.Handle("GET /academic/semesters", academic.NewGetAllSemestersHandler(authMW, semestersDB))
	router.Handle("GET /academic/semesters/active", academic.NewGetActiveSemesterHandler(authMW, semestersDB))
	router.Handle("GET /academic/semesters/{id}", academic.NewGetSemesterByIDHandler(authMW, semestersDB))
	router.Handle("PUT /academic/semesters/{id}", academic.NewEditSemesterHandler(authMW, semestersDB))

	// --- Module-related routes
	moduleDB := &academic.MongoModuleActions{
		Database: db,
	}
	router.Handle("GET /academic/semesters/{id}/modules", academic.NewModuleBySemesterHandler(authMW, moduleDB))

	return router
}
