package mw

import (
	"log/slog"
	"net/http"
	"time"
)

// --- Status Code Saving Wrapper for saving the status code
// Define the struct
type responseWriterWrapper struct {
	http.ResponseWriter
	statusCode int
}
// Override WriteHeader to catch status code
func (rw *responseWriterWrapper) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// --- Middleware for logging incoming request
func Logging() Middleware {

	// --- Create the middleware
	return func(f http.Handler) http.Handler {

		// --- Define the handlerFunc
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			// --- Init responseWriterWrapper
			wrapper := &responseWriterWrapper{
				ResponseWriter: w,
				statusCode: http.StatusOK,
			}

			// --- Logging logic
            start := time.Now()
            defer func() {
				preparedLogger := slog.With("path", r.URL.Path, "method", r.Method, "status", wrapper.statusCode, "duration", time.Since(start))
				if wrapper.statusCode >= 500 {
					preparedLogger.Error("HTTP Request")
				} else if wrapper.statusCode >= 400 && wrapper.statusCode <= 499 {
					preparedLogger.Warn("HTTP Request")
				} else {
					preparedLogger.Info("HTTP Request")
				}
			}()

            // --- Next func call
            f.ServeHTTP(wrapper, r)
		})
	}
}