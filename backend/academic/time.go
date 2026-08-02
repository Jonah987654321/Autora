package academic

import (
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

// --- Type used for converting time to bson/json
type JBsonTime struct {
	time.Time
}

func (t *JBsonTime) UnmarshalJSON(b []byte) error {
	date, err := time.Parse(`"2006-01-02"`, string(b))
	if err != nil {
		return fmt.Errorf("Failed to parse time: %w", err)
	}
	t.Time = date
	return nil
}

func (t JBsonTime) MarshalJSON() ([]byte, error) {
	formatted := fmt.Sprintf(`"%s"`, t.Time.Format("2006-01-02"))
	return []byte(formatted), nil
}

func (t JBsonTime) MarshalBSONValue() (byte, []byte, error) {
	tpe, data, err := bson.MarshalValue(t.Time)
	return byte(tpe), data, err
}

func (t *JBsonTime) UnmarshalBSONValue(tpe byte, data []byte) error {
	return bson.UnmarshalValue(bson.Type(tpe), data, &t.Time)
}
