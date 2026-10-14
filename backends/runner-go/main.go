package main

import (
	"errors"
	"log/slog"
	"net/http"
	"os"
	"time"
)

const (
	defaultPort       = "4004"
	portVariable      = "PORT"
	readHeaderTimeout = 10 * time.Second
	exitFailure       = 1
	allowedMethods    = "GET, POST, DELETE, OPTIONS"
	allowedHeaders    = "Content-Type, " + apiKeyHeader
)

func main() {
	port := os.Getenv(portVariable)
	if port == "" {
		port = defaultPort
	}
	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           (&server{newClient: defaultClientFactory}).routes(),
		ReadHeaderTimeout: readHeaderTimeout,
	}
	slog.Info("runner Go do Workbench ouvindo", "port", port, "sdkVersion", info().SDKVersion)
	err := srv.ListenAndServe()
	if err != nil && !errors.Is(err, http.ErrServerClosed) {
		slog.Error("runner encerrado com erro", "error", err)
		os.Exit(exitFailure)
	}
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Access-Control-Allow-Origin", "*")
		h.Set("Access-Control-Allow-Methods", allowedMethods)
		h.Set("Access-Control-Allow-Headers", allowedHeaders)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
