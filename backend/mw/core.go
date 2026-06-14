package mw

import "net/http"

// --- Middleware type
type Middleware func(http.HandlerFunc) http.HandlerFunc

// --- Apply multiple middlewares to a HandlerFunc
func Chain(endHandler http.HandlerFunc, middlewares ...Middleware) http.HandlerFunc {
	chain := endHandler
	for _, m := range middlewares {
		chain = m(chain)
	}
	return chain
}

func CoreChain(endHandler http.HandlerFunc, middlewares ...Middleware) http.HandlerFunc {
	return Chain(endHandler, append(middlewares, Logging())...)
}
