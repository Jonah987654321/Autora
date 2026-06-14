package mw

import (
	"fmt"
	"log"
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
	log.SetPrefix("mwLogging: ")
	log.SetFlags(0)

	// --- Create the middleware
	return func(f http.HandlerFunc) http.HandlerFunc {

		// --- Define the handlerFunc
		return func(w http.ResponseWriter, r *http.Request) {

			// --- Init responseWriterWrapper
			wrapper := &responseWriterWrapper{
				ResponseWriter: w,
				statusCode: http.StatusOK,
			}

			// --- Logging logic
            start := time.Now()
            defer func() {
				logMessage := fmt.Sprintf("[%v] %d %v %v took %v", time.Now().Local().Format("06/01/02 15:04:05"), wrapper.statusCode, r.Method, r.URL.Path, time.Since(start))
				log.Println(logMessage)
			}()

            // --- Next func call
            f(wrapper, r)
		}
	}
}