package notes

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var (
	ErrNoSuchModule   = errors.New("notes: no such module found")
	ErrNoSuchNote     = errors.New("notes: no such note found")
	ErrEndBeforeStart = errors.New("notes: end cannot be before start")
)

type Note struct {
	ID          bson.ObjectID   `bson:"_id" json:"id"`
	UserID      bson.ObjectID   `bson:"userID" json:"-"`
	ModuleID    bson.ObjectID   `bson:"moduleID" json:"moduleID"`
	Nr          int             `bson:"nr" json:"nr"`
	Title       string          `bson:"title" json:"title"`
	Start       time.Time       `bson:"start" json:"start"`
	End         time.Time       `bson:"end" json:"end"`
	LinkedFiles []bson.ObjectID `bson:"linkedFiles" json:"linkedFiles"`
	Content     bson.M          `bson:"content" json:"content"`
	Summary     bson.M          `bson:"summary" json:"summary"`
	SummaryDone bool            `bson:"summaryDone" json:"summaryDone"`
}

type NoteActionsMongo struct {
	CollectionNotes   *mongo.Collection
	CollectionModules *mongo.Collection
}

func (a *NoteActionsMongo) renumberModuleNotes(ctx context.Context, moduleID bson.ObjectID) error {
	findOpts := options.Find().
		SetSort(bson.D{
			{Key: "start", Value: 1},
			{Key: "_id", Value: 1}, // Same start -> decide by id
		}).
		SetProjection(bson.D{
			{Key: "_id", Value: 1},
			{Key: "nr", Value: 1},
		})

	dbCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	cursor, err := a.CollectionNotes.Find(dbCtx, bson.M{"moduleID": moduleID}, findOpts)
	if err != nil {
		return fmt.Errorf("failed to fetch notes for renumbering: %w", err)
	}
	defer cursor.Close(dbCtx)

	type noteEntry struct {
		ID bson.ObjectID `bson:"_id"`
		Nr int           `bson:"nr"`
	}

	var notes []noteEntry
	if err := cursor.All(dbCtx, &notes); err != nil {
		return fmt.Errorf("failed to decode notes for renumbering: %w", err)
	}

	if len(notes) == 0 {
		return nil
	}

	var writes []mongo.WriteModel
	for i, n := range notes {
		expectedNr := i + 1
		// Only update numbers that have actually changed
		if n.Nr != expectedNr {
			model := mongo.NewUpdateOneModel().
				SetFilter(bson.M{"_id": n.ID}).
				SetUpdate(bson.M{"$set": bson.M{"nr": expectedNr}})
			writes = append(writes, model)
		}
	}

	if len(writes) > 0 {
		_, err = a.CollectionNotes.BulkWrite(dbCtx, writes)
		if err != nil {
			return fmt.Errorf("failed to execute bulk renumbering: %w", err)
		}
	}

	return nil
}

func (a *NoteActionsMongo) CreateNote(ctx context.Context, userID, moduleID string, title string, start, end time.Time) (*Note, error) {
	// Parse IDs to ObjectIDs
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}
	moduleObjectID, err := bson.ObjectIDFromHex(moduleID)
	if err != nil {
		return nil, ErrNoSuchModule
	}

	if end.Before(start) {
		return nil, ErrEndBeforeStart
	}

	client := a.CollectionNotes.Database().Client()
	session, err := client.StartSession()
	if err != nil {
		return nil, fmt.Errorf("failed to start mongo session: %w", err)
	}
	defer session.EndSession(ctx)

	res, err := session.WithTransaction(ctx, func(sessCtx context.Context) (interface{}, error) {
		dbCtx, cancel := context.WithTimeout(sessCtx, 6*time.Second)
		defer cancel()

		modCount, err := a.CollectionModules.CountDocuments(dbCtx, bson.M{"_id": moduleObjectID, "userID": userObjectId})
		if err != nil {
			return nil, fmt.Errorf("failed to check moduleID against db: %w", err)
		}
		if modCount != 1 {
			return nil, ErrNoSuchModule
		}

		newNote := Note{
			ID:          bson.NewObjectID(),
			UserID:      userObjectId,
			ModuleID:    moduleObjectID,
			Nr:          0,
			Title:       title,
			Start:       start,
			End:         end,
			LinkedFiles: []bson.ObjectID{},
			Content:     bson.M{},
			Summary:     bson.M{},
			SummaryDone: false,
		}
		_, err = a.CollectionNotes.InsertOne(dbCtx, newNote)
		if err != nil {
			return nil, fmt.Errorf("failed to insert new note: %w", err)
		}

		if err := a.renumberModuleNotes(sessCtx, moduleObjectID); err != nil {
			return nil, fmt.Errorf("failed to renumber notes after creation: %w", err)
		}

		var updatedNote Note
		err = a.CollectionNotes.FindOne(dbCtx, bson.M{"_id": newNote.ID}).Decode(&updatedNote)
		if err != nil {
			return nil, fmt.Errorf("failed to reload updated note: %w", err)
		}

		return &updatedNote, nil
	})
	if err != nil {
		return nil, err
	}
	return res.(*Note), nil
}

func (a *NoteActionsMongo) UpdateNote(ctx context.Context, noteID, userID, moduleID string, title string, start, end time.Time, content, summary bson.M, summaryDone bool) (*Note, error) {
	userObjectID, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}

	noteObjectID, err := bson.ObjectIDFromHex(noteID)
	if err != nil {
		return nil, ErrNoSuchNote
	}

	moduleObjectID, err := bson.ObjectIDFromHex(moduleID)
	if err != nil {
		return nil, ErrNoSuchModule
	}

	if end.Before(start) {
		return nil, ErrEndBeforeStart
	}

	client := a.CollectionNotes.Database().Client()
	session, err := client.StartSession()
	if err != nil {
		return nil, fmt.Errorf("failed to start mongo session: %w", err)
	}
	defer session.EndSession(ctx)

	res, err := session.WithTransaction(ctx, func(sessCtx context.Context) (interface{}, error) {
		dbCtx, cancel := context.WithTimeout(sessCtx, 6*time.Second)
		defer cancel()

		modCount, err := a.CollectionModules.CountDocuments(dbCtx, bson.M{"_id": moduleObjectID, "userID": userObjectID})
		if err != nil {
			return nil, fmt.Errorf("failed to check moduleID against db: %w", err)
		}
		if modCount != 1 {
			return nil, ErrNoSuchModule
		}

		// Fetch existing note to preserve previous moduleID
		var existingNote Note
		err = a.CollectionNotes.FindOne(dbCtx, bson.M{"_id": noteObjectID, "userID": userObjectID}).Decode(&existingNote)
		if err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				return nil, ErrNoSuchNote
			}
			return nil, fmt.Errorf("failed to find existing note: %w", err)
		}

		oldModuleObjectID := existingNote.ModuleID

		filter := bson.M{
			"_id":    noteObjectID,
			"userID": userObjectID,
		}

		update := bson.M{
			"$set": bson.M{
				"moduleID":    moduleObjectID,
				"title":       title,
				"start":       start,
				"end":         end,
				"content":     content,
				"summary":     summary,
				"summaryDone": summaryDone,
			},
		}

		res, err := a.CollectionNotes.UpdateOne(dbCtx, filter, update)
		if err != nil {
			return nil, fmt.Errorf("failed to update note: %w", err)
		}
		if res.MatchedCount == 0 {
			return nil, ErrNoSuchNote
		}

		// Reorder target module
		if err := a.renumberModuleNotes(sessCtx, moduleObjectID); err != nil {
			return nil, fmt.Errorf("failed to renumber target module notes: %w", err)
		}

		// If module changed, reorder the old one as well
		if oldModuleObjectID != moduleObjectID {
			if err := a.renumberModuleNotes(sessCtx, oldModuleObjectID); err != nil {
				return nil, fmt.Errorf("failed to renumber old module notes: %w", err)
			}
		}

		// Reload new state of the note after reorder
		var updatedNote Note
		err = a.CollectionNotes.FindOne(dbCtx, bson.M{"_id": noteObjectID}).Decode(&updatedNote)
		if err != nil {
			return nil, fmt.Errorf("failed to reload updated note: %w", err)
		}

		return &updatedNote, nil
	})
	if err != nil {
		return nil, err
	}
	return res.(*Note), nil
}

func (a *NoteActionsMongo) DeleteNote(ctx context.Context, userID, noteID string) error {
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}
	noteObjectID, err := bson.ObjectIDFromHex(noteID)
	if err != nil {
		return ErrNoSuchNote
	}

	client := a.CollectionNotes.Database().Client()
	session, err := client.StartSession()
	if err != nil {
		return fmt.Errorf("failed to start mongo session: %w", err)
	}
	defer session.EndSession(ctx)

	_, err = session.WithTransaction(ctx, func(sessCtx context.Context) (interface{}, error) {
		dbCtx, cancel := context.WithTimeout(sessCtx, 2*time.Second)
		defer cancel()

		var deletedNote Note
		err = a.CollectionNotes.FindOneAndDelete(dbCtx, bson.M{"_id": noteObjectID, "userID": userObjectId}).Decode(&deletedNote)
		if err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				return nil, ErrNoSuchNote
			}

			return nil, fmt.Errorf("failed to delete from database: %w", err)
		}

		if err := a.renumberModuleNotes(sessCtx, deletedNote.ModuleID); err != nil {
			return nil, fmt.Errorf("failed to renumber notes after deletion: %w", err)
		}

		return nil, nil
	})
	return err
}

func (a *NoteActionsMongo) GetNoteByID(ctx context.Context, userID, noteID string) (*Note, error) {
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}
	noteObjectID, err := bson.ObjectIDFromHex(noteID)
	if err != nil {
		return nil, ErrNoSuchNote
	}

	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	var note Note
	err = a.CollectionNotes.FindOne(dbCtx, bson.M{"_id": noteObjectID, "userID": userObjectId}).Decode(&note)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrNoSuchNote
		}

		return nil, fmt.Errorf("failed to fetch/decode task: %w", err)
	}

	return &note, nil
}

func (a *NoteActionsMongo) GetNotesByModuleID(ctx context.Context, userID, moduleID string) ([]Note, error) {
	userObjectId, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert userID to ObjectID: %w", err)
	}
	moduleObjectID, err := bson.ObjectIDFromHex(moduleID)
	if err != nil {
		return nil, ErrNoSuchModule
	}

	dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	notes := []Note{}
	res, err := a.CollectionNotes.Find(dbCtx, bson.M{"moduleID": moduleObjectID, "userID": userObjectId}, options.Find().SetSort(bson.D{{Key: "nr", Value: -1}}))
	if err != nil {
		return nil, fmt.Errorf("failed to fetch tasks: %w", err)
	}
	err = res.All(dbCtx, &notes)
	if err != nil {
		return nil, fmt.Errorf("failed to decode tasks: %w", err)
	}

	return notes, nil
}
