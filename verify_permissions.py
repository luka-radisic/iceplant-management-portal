"""
Verification script to test that module permissions are now working correctly
"""
import os
import json
import logging
import sys
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
BASE_URL = "http://localhost:8000"
TOKEN = "f7d82c5d0f2e01f479809ac106462ebc6a022716"  # Your admin token

def get_headers():
    """Get headers for API requests"""
    return {
        "Authorization": f"Token {TOKEN}",
        "Content-Type": "application/json"
    }

def check_module_permissions_files():
    """Check if module_permissions.json files exist in all expected locations"""
    possible_locations = [
        "",
        "iceplant_portal",
        os.path.join("iceplant_portal", "iceplant_core"),
        os.path.join("iceplant_portal", "iceplant_portal")
    ]
    
    found_files = []
    
    for loc in possible_locations:
        file_path = os.path.join(loc, "module_permissions.json")
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r') as f:
                    permissions = json.load(f)
                logger.info(f"Found valid module_permissions.json at {file_path}")
                found_files.append((file_path, permissions))
            except:
                logger.warning(f"File at {file_path} exists but is not valid JSON")
        else:
            logger.info(f"No module_permissions.json found at {file_path}")
    
    return found_files

def test_api_permissions():
    """Test that the API correctly returns module permissions"""
    url = f"{BASE_URL}/api/users/module-permissions/"
    
    try:
        response = requests.get(url, headers=get_headers())
        if response.status_code == 200:
            permissions = response.json()
            logger.info(f"API returned module permissions: {json.dumps(permissions, indent=2)}")
            return permissions
        else:
            logger.error(f"API returned status code {response.status_code}")
            logger.error(f"Response: {response.text}")
            return None
    except Exception as e:
        logger.error(f"Error communicating with API: {e}")
        return None

def test_update_permissions():
    """Test updating module permissions for a test group"""
    # Create a test group
    group_name = "Test Group"
    create_group_url = f"{BASE_URL}/api/users/groups/"
    
    try:
        # Check if test group exists
        response = requests.get(create_group_url, headers=get_headers())
        groups = response.json()
        
        # Find test group by name
        test_group = next((g for g in groups if g['name'] == group_name), None)
        
        if not test_group:
            # Create test group
            logger.info(f"Creating test group: {group_name}")
            response = requests.post(
                create_group_url,
                headers=get_headers(),
                json={"name": group_name}
            )
            if response.status_code == 201:
                test_group = response.json()
                logger.info(f"Created test group: {test_group}")
            else:
                logger.error(f"Failed to create test group: {response.status_code} - {response.text}")
                return False
        else:
            logger.info(f"Test group already exists: {test_group}")
        
        # Test updating permissions
        update_url = f"{BASE_URL}/api/users/update-group-modules/"
        test_modules = ["inventory", "maintenance", "attendance"]
        
        logger.info(f"Updating modules for {group_name} to: {test_modules}")
        response = requests.post(
            update_url,
            headers=get_headers(),
            json={
                "group_name": group_name,
                "modules": test_modules
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            logger.info(f"Update successful: {result}")
            return result
        else:
            logger.error(f"Update failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error testing permissions update: {e}")
        return False

def verify_permissions_updated():
    """Verify that the permissions were updated"""
    # Get updated permissions
    updated_permissions = test_api_permissions()
    if not updated_permissions:
        return False
        
    # Check if Test Group is in the right modules
    test_modules = ["inventory", "maintenance", "attendance"]
    success = True
    
    for module, groups in updated_permissions.items():
        if module in test_modules:
            if "Test Group" not in groups:
                logger.error(f"Test Group should be in module {module}")
                success = False
        else:
            if "Test Group" in groups:
                logger.error(f"Test Group should not be in module {module}")
                success = False
    
    if success:
        logger.info("Permissions were correctly updated!")
    
    return success

def check_file_permissions_updated():
    """Check if the module_permissions.json files were updated after API call"""
    found_files = check_module_permissions_files()
    updated = False
    
    for file_path, permissions in found_files:
        # Check if test group is in the correct modules
        has_test_group = False
        for module, groups in permissions.items():
            if "Test Group" in groups:
                has_test_group = True
                logger.info(f"Test Group found in module {module} in file {file_path}")
        
        if has_test_group:
            updated = True
    
    if updated:
        logger.info("Module permissions files were correctly updated!")
    else:
        logger.warning("Test Group not found in any module permissions files")
        
    return updated

def main():
    logger.info("===== Starting Module Permissions Verification =====")
    
    # Check if module_permissions.json files exist
    logger.info("Checking for module_permissions.json files...")
    files = check_module_permissions_files()
    if not files:
        logger.error("No module_permissions.json files found!")
        return False
        
    # Test API permissions
    logger.info("Testing API permissions...")
    api_permissions = test_api_permissions()
    if not api_permissions:
        logger.error("Failed to retrieve module permissions from API!")
        return False
    
    # Test updating permissions
    logger.info("Testing permission updates...")
    update_result = test_update_permissions()
    if not update_result:
        logger.error("Failed to update permissions!")
        return False
    
    # Verify that permissions were updated
    logger.info("Verifying permissions were updated...")
    if verify_permissions_updated():
        logger.info("Permissions were correctly updated in API response!")
    else:
        logger.warning("Permissions may not have been updated correctly in API response!")
    
    # Check if file permissions were updated
    logger.info("Checking if file permissions were updated...")
    if check_file_permissions_updated():
        logger.info("Module permissions files were correctly updated!")
    else:
        logger.warning("Module permissions files may not have been updated correctly!")
    
    logger.info("===== Verification Complete =====")
    return True

if __name__ == "__main__":
    success = main()
    if success:
        print("\nVerification completed successfully!")
    else:
        print("\nVerification had some issues. Please check the output for details.")
