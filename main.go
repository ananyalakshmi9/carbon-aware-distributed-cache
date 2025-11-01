package main

import (
    "net/http"
)

// healthCheckHandler responds with the service status
func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
    // Set content type to JSON
    w.Header().Set("Content-Type", "application/json")
    
    // Set status code to 200 OK
    w.WriteHeader(http.StatusOK)
    
    // Write the JSON response body `{"status": "UP"}`
    w.Write([]byte(`{"status": "UP"}`))
}

func main() {
    http.HandleFunc("/health", healthCheckHandler)
    // We will add the cache server logic here later
    http.ListenAndServe(":8080", nil)
}
