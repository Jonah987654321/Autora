package main

import (
	"autora-backend/handlers"
	"autora-backend/mw"
	"net/http"
)

func main() {
	// --- Everything that is not explicitly handled by other routes -> 404
	http.HandleFunc("/", mw.CoreChain(func(w http.ResponseWriter, r *http.Request) {
		http.NotFound(w, r)
	}))

	// --- Handle request fetching notes
	http.HandleFunc("/notes/list", handlers.NoteListHandler)

    http.ListenAndServe(":8080", nil)
}