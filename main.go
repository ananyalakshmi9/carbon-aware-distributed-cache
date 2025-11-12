package main

import (
	"log"
	"net"
	"net/http"
	"time"

	"cache-service/cache" // Your generated gRPC code

	"github.com/prometheus/client_golang/prometheus/promhttp"
	"google.golang.org/grpc"
)

func main() {
	const (
		maxItems         = 1000
		persistenceFile  = "cache.snapshot.gob"
		snapshotInterval = 10 * time.Second
	)

	coreCache := NewLRUCache(maxItems, persistenceFile, snapshotInterval)
	cacheHandler := &CacheHandler{cache: coreCache}

	go startHTTPServer(cacheHandler)
	go startGRPCServer(coreCache)

	log.Printf("Persistence enabled: saving to %s every %s", persistenceFile, snapshotInterval)

	select {}
}

// startHTTPServer starts the HTTP server in a goroutine
func startHTTPServer(cacheHandler *CacheHandler) {
	mux := http.NewServeMux()

	// Serve the frontend dashboard
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		http.ServeFile(w, r, "index.html")
	})

	// Public API handlers
	mux.Handle("/v1/cache/", cacheHandler)
	mux.HandleFunc("/health", healthCheckHandler)
	mux.Handle("/metrics", promhttp.Handler())
	mux.HandleFunc("/v1/cache/batch", cacheHandler.handleBatch)

	// Admin (protected) handler
	mux.HandleFunc("/v1/admin/config/eviction", authMiddleware(cacheHandler.adminConfigEvictionHandler))

	log.Println("Starting HTTP REST server on :8080...")

	// Wrap the mux with the CORS middleware
	handler := corsMiddleware(mux)

	if err := http.ListenAndServe(":8080", handler); err != nil {
		log.Fatalf("Failed to start HTTP server: %v", err)
	}
}

// startGRPCServer starts the gRPC server in a goroutine
func startGRPCServer(c *LRUCache) {
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("Failed to listen for gRPC: %v", err)
	}

	s := grpc.NewServer()
	cache.RegisterCacheServiceServer(s, &gRPCServer{coreCache: c})

	log.Println("Starting gRPC server on :50051...")
	if err := s.Serve(lis); err != nil {
		log.Fatalf("Failed to start gRPC server: %v", err)
	}
}
