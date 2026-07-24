package mw

import "net/http"

// --- Middleware type
type Middleware func(http.Handler) http.Handler

// --- Apply multiple middlewares to a HandlerFunc
func Chain(endHandler http.Handler, middlewares ...Middleware) http.Handler {
	chain := endHandler
	for i := len(middlewares) -1; i >= 0; i-- {
		chain = middlewares[i](chain)
	}
	return chain
}

func CoreChain(endHandler http.Handler, middlewares ...Middleware) http.Handler {
	return Chain(endHandler, append([]Middleware{Logging()}, middlewares...)...)
}
