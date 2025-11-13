package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	// Note: We need to import the cache package to make the build successful for CI
	// This import path uses the module name you initialized with 'go mod init'
	_ "github.com/pestechnology/PESU_EC_CSE_A_P76_Simple_Caching_Service_visionaries/internal/cache"
)

// main is the entry point of the Caching Service application.
func main() {
	mux := http.NewServeMux()

	// Initial stub for /health endpoint (required for CI/CD to pass test coverage check)
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, "Service is healthy and running.")
	})

	// TODO: Add API handlers here for US-KV-001 (PUT), US-KV-002 (GET), etc.

	port := 8080
	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", port),
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	log.Printf("Starting Caching Service stub on port %d...", port)
	// We use a stub ListenAndServe call here for a runnable stub
	if err := server.ListenAndServe(); err != http.ErrServerClosed {
		// Log this as a graceful shutdown, not an error.
		log.Printf("INFO: Server stub shutting down.")
	}
}
