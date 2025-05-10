import requests
import json
import os

# Target: Delete Group ID 17 ("HR Payrol")
GROUP_ID_TO_DELETE = 17
url = f"http://localhost:8000/api/users/groups/{GROUP_ID_TO_DELETE}/" 
token = os.environ.get("API_AUTH_TOKEN")

headers = {
    "Authorization": f"Token {token}",
    "Content-Type": "application/json" # Content-Type might not be strictly needed for a DELETE with no body
}

if not token:
    print("Error: API_AUTH_TOKEN environment variable not set.")
else:
    try:
        print(f"Sending DELETE request to {url} to delete group ID {GROUP_ID_TO_DELETE}.")
        response = requests.delete(url, headers=headers)
        print(f"Status Code: {response.status_code}") # Expected: 204 No Content on successful deletion
        if response.status_code == 204:
            print(f"Group ID {GROUP_ID_TO_DELETE} successfully deleted.")
        elif response.content:
            print("Response JSON (or text if not JSON):")
            try:
                print(response.json())
            except requests.exceptions.JSONDecodeError:
                print(response.text)
        else:
            print("No content in response body.")

    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
