package routing

import (
	"autora-backend/auth"
	"autora-backend/mw"
	"net/http"

	"go.mongodb.org/mongo-driver/v2/mongo"
)

func CreateRouter(db *mongo.Database) (*http.ServeMux) {
	router := http.NewServeMux()

	// --- Everything that is not explicitly handled by other routes -> 404
	router.Handle("/", mw.CoreChain(http.NotFoundHandler()))

	// --- Authentication & user handling
	authDB := &auth.AuthActionsMongo {
		Database: db,
	}
	router.Handle("/auth/login", auth.NewLoginHandler(authDB))
	router.Handle("/auth/signup", auth.NewSignupHandler(authDB))

	return router
}
