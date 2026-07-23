package handlers

import (
	"autora-backend/models"
	"autora-backend/mw"
	"encoding/json"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

// --- Get all notes
var NoteListHandler = mw.CoreChain(getNoteList, mw.Method("GET"))

func getNoteList(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	notes := make([]models.Note, 0)
	notes = append(notes, models.Note{
		ID:        bson.NewObjectID(),
		Title:     "Test Note 1",
		CreatedAt: time.Now(),
	})

	json.NewEncoder(w).Encode(notes)
}
