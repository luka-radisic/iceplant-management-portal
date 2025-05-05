"""
Script to verify module permissions after frontend changes
"""
import requests
import json
import sys

BASE_URL = "http://localhost:8000"
TOKEN = "f7d82c5d0f2e01f479809ac106462ebc6a022716"  # Your admin token

def get_headers():
    return {
        "Authorization": f"Token {TOKEN}",
        "Content-Type": "application/json"
    }

def get_module_permissions():
    """Get the current module permissions mapping"""
    url = f"{BASE_URL}/api/users/module-permissions/"
    response = requests.get(url, headers=get_headers())
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error fetching module permissions: {response.status_code}")
        print(response.text)
        return None

def get_groups():
    """Get all groups"""
    url = f"{BASE_URL}/api/users/groups/"
    response = requests.get(url, headers=get_headers())
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error fetching groups: {response.status_code}")
        print(response.text)
        return None

def find_test_group(groups):
    """Find the Test Group in the list of groups"""
    for group in groups:
        if group['name'] == "Test Group":
            return group
    return None

def check_module_access(module_mapping, group_name):
    """Check which modules a group has access to"""
    access_info = {}
    for module, groups in module_mapping.items():
        access_info[module] = group_name in groups
    return access_info

def update_module_permissions(group_name, modules):
    """Update module permissions for a group"""
    url = f"{BASE_URL}/api/users/update-group-modules/"
    data = {
        "group_name": group_name,
        "modules": modules
    }
    response = requests.post(url, headers=get_headers(), json=data)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error updating module permissions: {response.status_code}")
        print(response.text)
        return None

def main():
    print("Fetching groups...")
    groups = get_groups()
    if not groups:
        print("Failed to fetch groups.")
        return
        
    test_group = find_test_group(groups)
    if not test_group:
        print("Test Group not found.")
        return
        
    print(f"Found Test Group: {test_group}")
    
    print("Fetching current module permissions...")
    module_mapping = get_module_permissions()
    if not module_mapping:
        print("Failed to fetch module permissions.")
        return
    
    # Check current access for Test Group
    access_info = check_module_access(module_mapping, "Test Group")
    print("\nCurrent module access for Test Group:")
    for module, has_access in access_info.items():
        print(f"  {module}: {'✓' if has_access else '✗'}")
    
    # Ask what to do
    print("\nWhat would you like to do?")
    print("1. Toggle maintenance module access")
    print("2. Toggle sales module access")
    print("3. Toggle all modules access")
    print("4. Reset all module access")
    print("5. Exit")
    
    choice = input("Enter your choice (1-5): ")
    
    if choice == "1":
        # Toggle maintenance module
        new_value = not access_info.get('maintenance', False)
        modules = {k: False for k in module_mapping.keys()}
        modules['maintenance'] = new_value
        print(f"Setting maintenance module access to: {new_value}")
        result = update_module_permissions("Test Group", modules)
        if result:
            print(f"Module permissions updated successfully: {result['message']}")
    elif choice == "2":
        # Toggle sales module
        new_value = not access_info.get('sales', False)
        modules = {k: False for k in module_mapping.keys()}
        modules['sales'] = new_value
        print(f"Setting sales module access to: {new_value}")
        result = update_module_permissions("Test Group", modules)
        if result:
            print(f"Module permissions updated successfully: {result['message']}")
    elif choice == "3":
        # Toggle all modules
        modules = {k: True for k in module_mapping.keys()}
        print("Setting all modules access to: True")
        result = update_module_permissions("Test Group", modules)
        if result:
            print(f"Module permissions updated successfully: {result['message']}")
    elif choice == "4":
        # Reset all modules
        modules = {k: False for k in module_mapping.keys()}
        print("Resetting all modules access")
        result = update_module_permissions("Test Group", modules)
        if result:
            print(f"Module permissions updated successfully: {result['message']}")
    elif choice == "5":
        return
    
    # Check updated permissions
    print("\nChecking updated module permissions...")
    updated_mapping = get_module_permissions()
    if updated_mapping:
        updated_access = check_module_access(updated_mapping, "Test Group")
        print("\nUpdated module access for Test Group:")
        for module, has_access in updated_access.items():
            print(f"  {module}: {'✓' if has_access else '✗'}")

if __name__ == "__main__":
    main()
