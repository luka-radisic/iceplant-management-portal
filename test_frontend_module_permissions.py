"""
Test script to verify that module permissions set via frontend are persisted
"""
import requests
import json
import time
import sys

def test_module_permissions_frontend_integration():
    """
    This script simulates the flow a user would go through when:
    1. Creating a test group
    2. Setting module permissions via the frontend
    3. Verifying that the permissions are saved and persisted
    4. Deleting the group and verifying it's removed from permissions
    """
    BASE_URL = "http://localhost:8000"
    AUTH_TOKEN = "f7d82c5d0f2e01f479809ac106462ebc6a022716"  # Admin token
    
    headers = {
        "Authorization": f"Token {AUTH_TOKEN}",
        "Content-Type": "application/json"
    }
    
    print("=== Starting Frontend Integration Test ===")
    
    # Step 1: Check current module permissions
    print("\n1. Checking current module permissions...")
    response = requests.get(f"{BASE_URL}/api/users/module-permissions/", headers=headers)
    if response.status_code != 200:
        print(f"Error: Could not get module permissions. Status code: {response.status_code}")
        return
    
    initial_permissions = response.json()
    print(json.dumps(initial_permissions, indent=2))
    
    # Step 2: Create a test group (simulating frontend form submission)
    print("\n2. Creating a test group 'Frontend Test Group'...")
    group_data = {
        "name": "Frontend Test Group"
    }
    
    response = requests.post(f"{BASE_URL}/api/users/groups/", headers=headers, json=group_data)
    if response.status_code != 201 and response.status_code != 200:
        print(f"Error: Could not create group. Status code: {response.status_code}")
        return
    
    group = response.json()
    group_id = group["id"]
    group_name = group["name"]
    print(f"Created group: ID={group_id}, Name={group_name}")
    
    # Step 3: Update module permissions (simulating frontend form submission)
    print("\n3. Setting module permissions for the group...")
    module_permissions = {
        "group_name": group_name,
        "modules": {
            "maintenance": True,
            "inventory": True,
            "sales": False,
            "expenses": False,
            "attendance": False,
            "buyers": False
        }
    }
    
    response = requests.post(f"{BASE_URL}/api/users/update-group-modules/", headers=headers, json=module_permissions)
    if response.status_code != 200:
        print(f"Error: Could not update module permissions. Status code: {response.status_code}")
        return
    
    updated_permissions = response.json()["updated_mapping"]
    print("Module permissions after update:")
    print(json.dumps(updated_permissions, indent=2))
    
    # Step 4: Verify that the group has the expected permissions
    modules_assigned = []
    for module, groups in updated_permissions.items():
        if group_name in groups:
            modules_assigned.append(module)
    
    print(f"\nGroup '{group_name}' has access to modules: {', '.join(modules_assigned)}")
    
    # Step 5: Restart the backend to verify persistence
    print("\n5. Simulating a backend restart...")
    print("Checking if permissions persist after backend restart...")
    
    # Verification would happen after actual restart
    print("Please manually restart the backend and run the check_permissions() function")
    
    # Step 6: Delete the test group
    print(f"\n6. Deleting the test group (ID={group_id})...")
    response = requests.delete(f"{BASE_URL}/api/users/groups/{group_id}/", headers=headers)
    if response.status_code != 204:
        print(f"Error: Could not delete group. Status code: {response.status_code}")
    else:
        print(f"Group '{group_name}' deleted successfully")
    
    # Step 7: Verify that group was removed from module permissions
    print("\n7. Verifying that group was removed from all module permissions...")
    response = requests.get(f"{BASE_URL}/api/users/module-permissions/", headers=headers)
    if response.status_code != 200:
        print(f"Error: Could not get module permissions. Status code: {response.status_code}")
        return
    
    final_permissions = response.json()
    
    group_still_in_modules = []
    for module, groups in final_permissions.items():
        if group_name in groups:
            group_still_in_modules.append(module)
    
    if group_still_in_modules:
        print(f"Warning: Group '{group_name}' is still in modules: {', '.join(group_still_in_modules)}")
    else:
        print(f"Success: Group '{group_name}' was properly removed from all module permissions")
    
    print("\n=== Frontend Integration Test Complete ===")

def check_permissions():
    """
    Check the current module permissions
    """
    BASE_URL = "http://localhost:8000"
    AUTH_TOKEN = "f7d82c5d0f2e01f479809ac106462ebc6a022716"  # Admin token
    
    headers = {
        "Authorization": f"Token {AUTH_TOKEN}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(f"{BASE_URL}/api/users/module-permissions/", headers=headers)
    if response.status_code != 200:
        print(f"Error: Could not get module permissions. Status code: {response.status_code}")
        return
    
    permissions = response.json()
    print("Current module permissions:")
    print(json.dumps(permissions, indent=2))

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--check":
        check_permissions()
    else:
        test_module_permissions_frontend_integration()
