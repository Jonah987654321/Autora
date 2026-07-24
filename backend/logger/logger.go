package logger

import (
	"log/slog"
	"os"
)

func Init() {
	opts := slog.HandlerOptions{
		AddSource: false,
		Level: slog.LevelDebug,
	}
	handler := slog.NewTextHandler(os.Stdout, &opts)
	logger := slog.New(handler)
	slog.SetDefault(logger)
}