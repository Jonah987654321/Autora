package routing

import (
	"autora-backend/academic"
	"autora-backend/auth"
	"autora-backend/calendar"
	"autora-backend/database"
	"autora-backend/mw"
	"autora-backend/token"
	"net/http"
)

func CreateRouter(collections database.AllCollections, jwtService *token.JWTService) *http.ServeMux {
	router := http.NewServeMux()

	// --- Everything that is not explicitly handled by other routes -> 404
	router.Handle("/", mw.CoreChain(http.NotFoundHandler()))

	// --- Authentication & user handling
	authDB := &auth.AuthActionsMongo{
		Collection: collections.Auth,
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
		Collection: collections.Semesters,
	}
	router.Handle("POST /academic/semesters", academic.NewCreateSemesterHandler(authMW, semestersDB))
	router.Handle("GET /academic/semesters", academic.NewGetAllSemestersHandler(authMW, semestersDB))
	router.Handle("GET /academic/semesters/active", academic.NewGetActiveSemesterHandler(authMW, semestersDB))
	router.Handle("GET /academic/semesters/{id}", academic.NewGetSemesterByIDHandler(authMW, semestersDB))
	router.Handle("PUT /academic/semesters/{id}", academic.NewEditSemesterHandler(authMW, semestersDB))

	// --- Module-related routes
	moduleDB := &academic.MongoModuleActions{
		CollectionModules:  collections.Modules,
		CollectionSemester: collections.Semesters,
	}
	router.Handle("POST /academic/semesters/{id}/modules", academic.NewCreateModuleHandler(authMW, moduleDB))
	router.Handle("GET /academic/semesters/{id}/modules", academic.NewModuleBySemesterHandler(authMW, moduleDB))
	router.Handle("GET /academic/modules/{id}", academic.NewGetModuleByIDHandler(authMW, moduleDB))
	router.Handle("PUT /academic/modules/{id}", academic.NewEditModuleHandler(authMW, moduleDB))
	router.Handle("PUT /academic/modules/{id}/weekly-schedule", academic.NewSetWeeklyScheduleHandler(authMW, moduleDB))

	// --- Calendar (event) related routes
	eventDB := &calendar.MongoCalendarActions{
		CollectionCalendar: collections.Events,
		CollectionModules:  collections.Modules,
	}
	router.Handle("POST /calendar/events", calendar.NewCreateEventHandler(authMW, eventDB))
	router.Handle("PUT /calendar/events/{id}", calendar.NewUpdateEventHandler(authMW, eventDB))
	router.Handle("DELETE /calendar/events/{id}", calendar.NewDeleteEventHandler(authMW, eventDB))
	router.Handle("GET /calendar/modules/{id}/upcoming", calendar.NewModuleUpcomingEventHandler(authMW, eventDB))

	return router
}
