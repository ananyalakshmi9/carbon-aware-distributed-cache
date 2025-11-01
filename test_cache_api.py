import requests  # To send HTTP requests
import pytest    # The test framework
import time      # To test the 'expiration' feature

# --- API Configuration ---
# This is the 'API Contract'.
# IMPORTANT: You might need to change this URL when the developers give
# you the real one (e.g., http://localhost:5000/api/v1)
BASE_URL = "http://localhost:8080/cache" 

# --- Test Suite ---

def test_put_new_key_success():
    """
    Tests Jira Story 1: API can successfully store a new key-value pair
    """
    print("Running: test_put_new_key_success")
    payload = {
        "key": "testKey1",
        "value": "hello world",
        "ttl": 60  # 60 seconds
    }
    
    # Send the PUT request to the /cache endpoint
    response = requests.put(BASE_URL, json=payload)
    
    # Check the Acceptance Criteria: Did we get a success code?
    assert response.status_code == 201  # 201 Created

def test_get_existing_key_success():
    """
    Tests Jira Story 2: API can successfully retrieve an existing key
    """
    print("Running: test_get_existing_key_success")
    key = "testKey2"
    value = "data-to-retrieve"
    
    # --- Arrange (Setup) ---
    # First, we MUST store a key to make sure it exists
    put_payload = {"key": key, "value": value, "ttl": 60}
    
    try:
        put_response = requests.put(BASE_URL, json=put_payload)
        assert put_response.status_code == 201 # Make sure setup worked
    except requests.exceptions.ConnectionError:
        pytest.fail(f"ConnectionError: Prerequisite PUT failed for {key}. Is the server running at {BASE_URL}?")

    
    # --- Act (The Test) ---
    # Now, try to GET the key we just created
    get_response = requests.get(f"{BASE_URL}/{key}")
    
    # --- Assert (Check the results) ---
    assert get_response.status_code == 200
    
    response_data = get_response.json()
    assert response_data["value"] == value

def test_get_non_existent_key_404():
    """
    Tests Jira Story 3: API returns 404 for a non-existent key
    """
    print("Running: test_get_non_existent_key_404")
    key = "keyThatDoesNotExist"
    
    # Send the GET request
    response = requests.get(f"{BASE_URL}/{key}")
    
    # Check Acceptance Criteria: Did we get 404 Not Found?
    assert response.status_code == 404

def test_get_expired_key_404():
    """
    Tests Jira Story 4: API automatically expires a key after its TTL
    """
    print("Running: test_get_expired_key_404")
    key = "shortLivedKey"
    
    # --- Arrange (Setup) ---
    # Create a key with a VERY short life: 2 seconds
    put_payload = {"key": key, "value": "will-expire-soon", "ttl": 2}
    
    try:
        put_response = requests.put(BASE_URL, json=put_payload)
        assert put_response.status_code == 201 # Make sure setup worked
    except requests.exceptions.ConnectionError:
        pytest.fail(f"ConnectionError: Prerequisite PUT failed for {key}. Is the server running at {BASE_URL}?")
    
    # --- Act (The Test) ---
    # Check Acceptance Criteria 1: Wait for 3 seconds (so it expires)
    print("  ...waiting 3 seconds for key to expire...")
    time.sleep(3)
    
    # Now, try to get the key
    get_response = requests.get(f"{BASE_URL}/{key}")
    
    # --- Assert (Check the results) ---
    assert get_response.status_code == 404

def test_delete_key_success():
    """
    Tests Jira Story 5: API can successfully delete an existing key
    """
    print("Running: test_delete_key_success")
    key = "keyToDelete"
    value = "data-to-be-deleted"
    
    # --- Arrange (Setup) ---
    # 1. First, we MUST store a key to make sure it exists
    put_payload = {"key": key, "value": value, "ttl": 60}
    
    try:
        put_response = requests.put(BASE_URL, json=put_payload)
        assert put_response.status_code == 201 
    except requests.exceptions.ConnectionError:
        pytest.fail(f"ConnectionError: Prerequisite PUT failed for {key}. Is the server running at {BASE_URL}?")

    # --- Act 1 (The DELETE Test) ---
    # 2. Now, send the DELETE request for that key
    delete_response = requests.delete(f"{BASE_URL}/{key}")
    
    # --- Assert 1 ---
    # Check Acceptance Criteria 1: Did the DELETE succeed?
    # 204 No Content is the most technically correct response for a successful DELETE
    assert delete_response.status_code == 204
    
    # --- Act 2 (Verify) ---
    # 3. Send a GET request for the key we just deleted
    get_response = requests.get(f"{BASE_URL}/{key}")
    
    # --- Assert 2 ---
    # Check Acceptance Criteria 2: Is it gone?
    assert get_response.status_code == 404