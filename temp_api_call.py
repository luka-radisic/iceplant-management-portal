import requests
import json
import os

# Target: Get Group ID for "HR Payrol"
url = "http://localhost:8000/api/users/groups/" 
token = os.environ.get("API_AUTH_TOKEN")

headers = {
    "Authorization": f"Token {token}",
    "Content-Type": "application/json"
}

if not token:
    print("Error: API_AUTH_TOKEN environment variable not set.")
else:
    try:
        print(f"Sending GET request to {url} to find group ID.")
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        print("Response JSON:")
        try:
            groups = response.json()
            print(json.dumps(groups, indent=2))
            hr_payrol_group = next((g for g in groups if g.get('name') == 'HR Payrol'), None)
            if hr_payrol_group:
                print(f"\nFound 'HR Payrol' group with ID: {hr_payrol_group.get('id')}")
            else:
                print("\n'HR Payrol' group not found.")
        except requests.exceptions.JSONDecodeError:
            print("Response content (not JSON):")
            print(response.text)
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
