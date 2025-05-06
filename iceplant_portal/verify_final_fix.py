"""
Final verification test for module permissions removal.
"""

import os
import sys
import django
import json
import logging
import requests

# Set up Django environment
sys.path.append("/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "iceplant_core.settings")
django.setup()

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

def verify_module_permissions():
    """Run a complete verification test of adding and removing module permissions"""
    from django.contrib.auth.models import Group, User, Permission
    
    # 1. Set up test data
    group_name = "VerificationTestGroup"
    module_name = "buyers"
    
    # Create or get the group
    group, created = Group.objects.get_or_create(name=group_name)
    if created:
        logger.info(f"Created test group {group_name}")
    else:
        logger.info(f"Using existing group {group_name}")
        # Clear any existing permissions
        group.permissions.clear()
        logger.info("Cleared existing permissions")
    
    # Get an admin token for API calls
    try:
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            logger.error("No admin user found")
            return
            
        from rest_framework.authtoken.models import Token
        token, _ = Token.objects.get_or_create(user=admin_user)
        headers = {"Authorization": f"Token {token.key}"}
    except Exception as e:
        logger.error(f"Error getting admin token: {e}")
        return
    
    # 2. Test adding module permissions via API
    try:
        logger.info(f"Adding {module_name} module to {group_name}")
        
        # First verify that the group has no permissions
        buyers_perms = group.permissions.filter(content_type__app_label=module_name)
        logger.info(f"Initial {module_name} permissions: {buyers_perms.count()}")
        
        # Make the API call
        modules_data = {
            "group_name": group_name,
            "modules": {
                module_name: True
            }
        }
        
        response = requests.post(
            "http://localhost:8000/api/users/update-group-modules/",
            json=modules_data,
            headers=headers
        )
        
        if response.status_code == 200:
            logger.info("API call successful:")
            resp_data = response.json()
            logger.info(f"Response: {json.dumps(resp_data, indent=2)}")
            
            # Check if module appears in the response mapping
            if group_name in resp_data["updated_mapping"][module_name]:
                logger.info(f"Group {group_name} appears in {module_name} mapping in response")
            else:
                logger.error(f"Group {group_name} not found in {module_name} mapping in response!")
        else:
            logger.error(f"API call failed: {response.status_code}")
            logger.error(response.text)
            return
    except Exception as e:
        logger.error(f"Error in API call: {e}")
        return
    
    # 3. Verify permissions were assigned
    group = Group.objects.get(name=group_name)  # Reload group
    buyers_perms = group.permissions.filter(content_type__app_label=module_name)
    logger.info(f"{module_name} permissions after adding: {buyers_perms.count()}")
    
    if buyers_perms.count() > 0:
        logger.info("Permissions successfully assigned:")
        for perm in buyers_perms:
            logger.info(f"  - {perm.content_type.app_label}.{perm.codename}")
    else:
        logger.error("No permissions were assigned!")
        return
    
    # 4. Test removing module permissions via API
    try:
        logger.info(f"Removing {module_name} module from {group_name}")
        
        # Make the API call
        modules_data = {
            "group_name": group_name,
            "modules": {
                module_name: False
            }
        }
        
        response = requests.post(
            "http://localhost:8000/api/users/update-group-modules/",
            json=modules_data,
            headers=headers
        )
        
        if response.status_code == 200:
            logger.info("API call successful:")
            resp_data = response.json()
            logger.info(f"Response: {json.dumps(resp_data, indent=2)}")
            
            # Check if group is removed from module mapping
            if group_name not in resp_data["updated_mapping"][module_name]:
                logger.info(f"Group {group_name} correctly removed from {module_name} mapping in response")
            else:
                logger.error(f"Group {group_name} still present in {module_name} mapping in response!")
        else:
            logger.error(f"API call failed: {response.status_code}")
            logger.error(response.text)
            return
    except Exception as e:
        logger.error(f"Error in API call: {e}")
        return
    
    # 5. Verify permissions were removed
    group = Group.objects.get(name=group_name)  # Reload group
    buyers_perms = group.permissions.filter(content_type__app_label=module_name)
    logger.info(f"{module_name} permissions after removal: {buyers_perms.count()}")
    
    if buyers_perms.count() == 0:
        logger.info("SUCCESS: All permissions successfully removed!")
    else:
        logger.error(f"ERROR: {buyers_perms.count()} permissions still remain!")
        for perm in buyers_perms:
            logger.error(f"  - {perm.content_type.app_label}.{perm.codename}")
    
    # 6. Also check HasModulePermission
    from iceplant_core.group_permissions import HasModulePermission
    
    # Create a test user and add to group
    test_user = User.objects.create_user(
        username="temp_verification_user",
        email="temp@example.com",
        password="temppass123"
    )
    test_user.groups.add(group)
    
    # Create a mock request
    request_mock = type("Request", (), {"user": test_user})
    
    # Check module permission
    has_perm = HasModulePermission(module_name).has_permission(request_mock, None)
    logger.info(f"HasModulePermission({module_name}).has_permission result: {has_perm}")
    
    if not has_perm:
        logger.info("SUCCESS: HasModulePermission correctly returns False")
    else:
        logger.error("ERROR: HasModulePermission incorrectly returns True!")
    
    # Clean up
    test_user.delete()
    group.delete()
    logger.info("Test cleanup completed")

if __name__ == "__main__":
    logger.info("Starting module permissions verification test...")
    verify_module_permissions()
    logger.info("Test completed")
