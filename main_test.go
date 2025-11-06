package main

import (
    "net/http"
    "net/http/httptest"
    "testing"
    "io/ioutil"
)

func TestHealthCheckHandler(t *testing.T) {
    // Create a mock request
    req, err := http.NewRequest("GET", "/health", nil)
    if err != nil {
        t.Fatal(err)
    }

    // Create a ResponseRecorder to capture the response
    rr := httptest.NewRecorder()
    handler := http.HandlerFunc(healthCheckHandler)

    // Call the handler
    handler.ServeHTTP(rr, req)

    // 1. Check the Status Code
    if status := rr.Code; status != http.StatusOK {
        t.Errorf("handler returned wrong status code: got %v want %v",
            status, http.StatusOK)
    }

    // 2. Check the Response Body
    expected := `{"status": "UP"}`
    body, _ := ioutil.ReadAll(rr.Body)
    if string(body) != expected {
        t.Errorf("handler returned unexpected body: got %v want %v",
            string(body), expected)
    }
}
