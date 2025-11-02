import requests  # To send HTTP requests
import pytest    # The test framework
import time      # To test the 'expiration' feature

# --- API Configuration ---
# This is the 'API Contract' based on the SAD.
CACHE_BASE_URL = "http://localhost:8080/v1/cache"
HEALTH_BASE_URL = "http://localhost:8080" # For the /health endpoint

# --- Test Suite ---

def test_health_check_endpoint():
    """
    Tests SCRUM-24: The /health endpoint
    """
    print("Running: test_health_check_endpoint")
    
    # Send a GET request to the new /health endpoint
    try:
        response = requests.get(f"{HEALTH_BASE_URL}/health")
        
        # --- Assert (Check the results) ---
        assert response.status_code == 200
        assert response.json() == {"status": "UP"}
        
    except requests.exceptions.ConnectionError:
        pytest.fail(f"ConnectionError: /health endpoint test failed. Is the server running at {HEALTH_BASE_URL}?")


def test_put_new_key_success():
    """
    Tests Jira Story 1: API can successfully store a new key-value pair
    UPDATED: to match PUT /v1/cache/{key}?ttl=...
    """
    print("Running: test_put_new_key_success")
    key = "testKey1"
    value = "hello world"
    ttl = 60
    
    # Send the PUT request with:
    # 1. key in the URL
    # 2. ttl as a query parameter
    # 3. value as raw data in the body
    try:
        response = requests.put(
            f"{CACHE_BASE_URL}/{key}", 
            params={"ttl": ttl}, 
            data=value
        )
        # Check the Acceptance Criteria: Did we get a success code?
        # SAD specifies 201 for Created or 200 for Updated
        assert response.status_code in [200, 201]
        
    except requests.exceptions.ConnectionError:
        pytest.fail(f"ConnectionError: PUT test failed. Is the server running at {CACHE_BASE_URL}?")


def test_get_existing_key_success():
    """
    Tests Jira Story 2: API can successfully retrieve an existing key
    UPDATED: PUT setup and GET response check
    """
    print("Running: test_get_existing_key_success")
    key = "testKey2"
    value = "data-to-retrieve"
    
    # --- Arrange (Setup) ---
    # First, we MUST store a key to make sure it exists (using the new PUT format)
    try:
        put_response = requests.put(
            f"{CACHE_BASE_URL}/{key}", 
            params={"ttl": 60}, 
            data=value
        )
        assert put_response.status_code in [200, 201] # Make sure setup worked
    except requests.exceptions.ConnectionError:
        pytest.fail(f"ConnectionError: Prerequisite PUT failed for {key}. Is the server running at {CACHE_BASE_URL}?")

    
    # --- Act (The Test) ---
    # Now, try to GET the key we just created
    get_response = requests.get(f"{CACHE_BASE_URL}/{key}")
    
    # --- Assert (Check the results) ---
    assert get_response.status_code == 200
    
    # PER THE SAD: The response body IS the value, not JSON
    assert get_response.text == value

def test_get_non_existent_key_404():
    """
    Tests Jira Story 3: API returns 404 for a non-existent key
    """
    print("Running: test_get_non_existent_key_404")
    key = "keyThatDoesNotExist"
    
    # Send the GET request
    try:
        response = requests.get(f"{CACHE_BASE_URL}/{key}")
        # Check Acceptance Criteria: Did we get 404 Not Found?
        assert response.status_code == 404
        
    except requests.exceptions.ConnectionError:
        pytest.fail(f"ConnectionError: GET 404 test failed. Is the server running at {CACHE_BASE_URL}?")


def test_get_expired_key_404():
    """
    Tests Jira Story 4: API automatically expires a key after its TTL
    UPDATED: PUT setup
    """
    print("Running: test_get_expired_key_404")
    key = "shortLivedKey"
    value = "will-expire-soon"
    
    # --- Arrange (Setup) ---
    # Create a key with a VERY short life: 2 seconds (using the new PUT format)
    try:
        put_response = requests.put(
            f"{CACHE_BASE_URL}/{key}", 
            params={"ttl": 2}, 
            data=value
        )
        assert put_response.status_code in [200, 201] # Make sure setup worked
    except requests.exceptions.ConnectionError:
        pytest.fail(f"ConnectionError: Prerequisite PUT failed for {key}. Is the server running at {CACHE_BASE_URL}?")
    
    # --- Act (The Test) ---
    print("  ...waiting 3 seconds for key to expire...")
    time.sleep(3)
    
    # Now, try to get the key
    get_response = requests.get(f"{CACHE_BASE_URL}/{key}")
    
    # --- Assert (Check the results) ---
    assert get_response.status_code == 404 # Key should be Not Found (expired)

def test_delete_key_success():
    """
    Tests Jira Story 5: API can successfully delete an existing key
    UPDATED: PUT setup
    """
    print("Running: test_delete_key_success")
    key = "keyToDelete"
    value = "data-to-be-deleted"
    
    # --- Arrange (Setup) ---
    # (Using the new PUT format)
    try:
        put_response = requests.put(
            f"{CACHE_BASE_URL}/{key}", 
            params={"ttl": 60}, 
            data=value
        )
        assert put_response.status_code in [200, 201] 
    except requests.exceptions.ConnectionError:
        pytest.fail(f"ConnectionError: Prerequisite PUT failed for {key}. Is the server running at {CACHE_BASE_URL}?")

    # --- Act 1 (The DELETE Test) ---
    # This endpoint logic remains the same: DELETE /v1/cache/{key}
    delete_response = requests.delete(f"{CACHE_BASE_URL}/{key}")
    
    # --- Assert 1 ---
    assert delete_response.status_code == 204 # 204 No Content
    
    # --- Act 2 (Verify) ---
    get_response = requests.get(f"{CACHE_BASE_URL}/{key}")
    
    # --- Assert 2 ---
    assert get_response.status_code == 404