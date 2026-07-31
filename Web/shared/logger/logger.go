// Package logger provides the structured JSON logger used across the service.
// Replaces the pino logger from nexoraldns-shared: same call shape (message
// first, optional detail second), same LOG_LEVEL env var, ISO-8601 timestamps.
package logger

import (
	"context"
	"log/slog"
	"os"
	"strings"
)

var log *slog.Logger

func init() {
	log = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: levelFromEnv()}))
}

func levelFromEnv() slog.Level {
	switch strings.ToLower(os.Getenv("LOG_LEVEL")) {
	case "trace", "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error", "fatal":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// detail flattens the optional second argument the same way pino's toPlain did:
// errors become their message, byte slices become strings, everything else is
// passed through for the JSON handler to encode.
func detail(args []any) []slog.Attr {
	if len(args) == 0 {
		return nil
	}
	switch v := args[0].(type) {
	case nil:
		return nil
	case error:
		return []slog.Attr{slog.String("err", v.Error())}
	case []byte:
		return []slog.Attr{slog.String("detail", string(v))}
	default:
		return []slog.Attr{slog.Any("detail", v)}
	}
}

func emit(level slog.Level, msg string, args []any) {
	log.LogAttrs(context.Background(), level, msg, detail(args)...)
}

func Debug(msg string, args ...any) { emit(slog.LevelDebug, msg, args) }
func Info(msg string, args ...any)  { emit(slog.LevelInfo, msg, args) }
func Warn(msg string, args ...any)  { emit(slog.LevelWarn, msg, args) }
func Error(msg string, args ...any) { emit(slog.LevelError, msg, args) }
