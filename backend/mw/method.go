package mw

import "net/http"

// --- Middleware for enforcing HTTP Request methods
func Method(m string) Middleware {
    return func(f http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

            // --- Ensure the method is matching
            if r.Method != m {
                http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
                return
            }

            f.ServeHTTP(w, r)
        })
    }
}
