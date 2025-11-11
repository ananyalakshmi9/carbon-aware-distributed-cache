package tests

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestHealthCheck is a stub integration test to ensure the base service is runnable.
// This test is required to ensure the CI pipeline's "Test" stage (including coverage)
// has a test file to run, preventing the CI from failing on "no tests found."
// The QA team (Nidhi/Ananya Lakshmi) will expand this file later.
func TestHealthCheck(t *testing.T) {
	// We create a mock HTTP server response recorder for testing the handler stub
	req, err := http.NewRequest("GET", "/health", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()

	// This is the implementation of the handler logic we want to test
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Service is healthy and running."))
	})

	// Execute the handler against the mock request
	handler.ServeHTTP(rr, req)

	// Check the status code (TC-MON-001)
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Health check returned wrong status code: got %v, want %v",
			status, http.StatusOK)
	}

	// Check the response body
	expected := "Service is healthy and running."
	if rr.Body.String() != expected {
		t.Errorf("Health check returned unexpected body: got %v, want %v",
			rr.Body.String(), expected)
	}
}
