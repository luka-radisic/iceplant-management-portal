#!/usr/bin/env python
"""
Test script to verify module permissions assignment and removal.
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

def test_module_permissions_flow():
    """Test the complete flow of module permissions assignment and removal"""
    from django.contrib.auth.models import Group, User, Permission
    from iceplant_core.group_permissions import HasModulePermission
    from iceplant_core.module_permissions_utils import (
        assign_module_permissions_to_group,
        remove_module_permissions_from_group,
        save_module_permissions,
        sync_module_permissions
    )
    
    # 1. Set up - create a test group and assign it some permissions
    group_name = "PermissionsTestGroup"
    try:
        group = Group.objects.get(name=group_name)
        logger.info(f"Using existing group '{group_name}'")
    except Group.DoesNotExist:
        group = Group.objects.create(name=group_name)
        logger.info(f"Created new group '{group_name}'")
    
    # Clear any existing permissions
    logger.info(f"Clearing existing permissions for '{group_name}'")
    group.permissions.clear()
    
    # Get admin user for API calls
    try:
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            admin_user = User.objects.create_superuser(
                username="admin_test",
                email="admin_test@example.com",
                password="testpassword123"
            )
        from rest_framework.authtoken.models import Token
        token, _ = Token.objects.get_or_create(user=admin_user)
        headers = {"Authorization": f"Token {token.key}"}
        logger.info(f"Using admin user: {admin_user.username}")
    except Exception as e:
        logger.error(f"Error setting up admin user: {e}")
        return
    
    # 2. Make sure Test Group is removed from module mapping
    logger.info("Initial state - removing test group from all modules")
    for module in HasModulePermission.MODULE_GROUP_MAPPING:
        if group_name in HasModulePermission.MODULE_GROUP_MAPPING[module]:
            HasModulePermission.MODULE_GROUP_MAPPING[module].remove(group_name)
    
    # Save and sync permissions
    save_module_permissions()
    sync_module_permissions()
    
    # 3. Verify initial state
    logger.info("Verifying initial state (no permissions):")
    buyers_perms = [p for p in group.permissions.all() if p.content_type.app_label == 'buyers']
    if buyers_perms:
        logger.error(f"Initial state has buyers permissions? {buyers_perms}")
    else:
        logger.info("Initial state correct - no buyers permissions")
    
    # 4. First API call - assign buyers module
    logger.info("==== STEP 1: Adding buyers module via API call ====")
    modules_data = {
        "group_name": group_name,
        "modules": {
            "buyers": True  # Only enable buyers module
        }
    }
    
    try:
        response = requests.post(
            "http://localhost:8000/api/users/update-group-modules/", 
            json=modules_data,
            headers=headers
        )
        
        if response.status_code == 200:
            logger.info("API call successful:")
            logger.info(json.dumps(response.json(), indent=2))
        else:
            logger.error(f"API call failed with status code {response.status_code}:")
            logger.error(response.text)
            return
    except Exception as e:
        logger.error(f"Error making API call: {e}")
        return
    
    # 5. Verify that buyers module was properly assigned
    logger.info("Verifying buyers module was assigned:")
    group = Group.objects.get(name=group_name)  # Reload the group
    buyers_perms = [p for p in group.permissions.all() if p.content_type.app_label == 'buyers']
    
    if not buyers_perms:
        logger.error("ERROR: Buyers permissions were not properly assigned")
    else:
        logger.info(f"SUCCESS: Found {len(buyers_perms)} buyers permissions:")
        for perm in buyers_perms:
            logger.info(f"  - buyers.{perm.codename}")
    
    # 6. Check if the module mapping was updated 
    logger.info("Current module mapping:")
    logger.info(json.dumps(HasModulePermission.MODULE_GROUP_MAPPING, indent=2))
    
    if group_name in HasModulePermission.MODULE_GROUP_MAPPING.get('buyers', []):
        logger.info(f"Group '{group_name}' correctly added to buyers module mapping")
    else:
        logger.error(f"ERROR: Group '{group_name}' NOT found in buyers module mapping")
    
    # 7. Second API call - remove buyers module 
    logger.info("==== STEP 2: Removing buyers module via API call ====")
    modules_data = {
        "group_name": group_name,
        "modules": {
            "buyers": False  # Explicitly disable buyers module
        }
    }
    
    try:
        response = requests.post(
            "http://localhost:8000/api/users/update-group-modules/", 
            json=modules_data,
            headers=headers
        )
        
        if response.status_code == 200:
            logger.info("API call successful:")
            logger.info(json.dumps(response.json(), indent=2))
        else:
            logger.error(f"API call failed with status code {response.status_code}:")
            logger.error(response.text)
            return
    except Exception as e:
        logger.error(f"Error making API call: {e}")
        return
    
    # 8. Verify that buyers module was properly removed
    logger.info("Verifying buyers module was removed:")
    group = Group.objects.get(name=group_name)  # Reload the group
    buyers_perms = [p for p in group.permissions.all() if p.content_type.app_label == 'buyers']
    
    if buyers_perms:
        logger.error(f"ERROR: Buyers permissions still exist after removal! Found {len(buyers_perms)}:")
        for perm in buyers_perms:
            logger.error(f"  - buyers.{perm.codename}")
    else:
        logger.info("SUCCESS: No buyers permissions remain after removal")
    
    # 9. Check if the module mapping was updated after removal
    logger.info("Module mapping after removal:")
    logger.info(json.dumps(HasModulePermission.MODULE_GROUP_MAPPING, indent=2))
    
    if group_name in HasModulePermission.MODULE_GROUP_MAPPING.get('buyers', []):
        logger.error(f"ERROR: Group '{group_name}' still found in buyers module mapping after removal")
    else:
        logger.info(f"Group '{group_name}' correctly removed from buyers module mapping")
    
    # 10. Verify by directly accessing HasModulePermission
    logger.info("==== STEP 3: Direct access check ====")
    # Create a mock user with this group
    test_user = User.objects.create_user(
        username="test_module_user",
        email="test_module@example.com",
        password="password123"
    )
    test_user.groups.add(group)
    
    # Create a mock request
    request_mock = type('Request', (), {'user': test_user})
    
    # Check if the user has module permission
    has_module_permission = HasModulePermission('buyers')
    has_access = has_module_permission.has_permission(request_mock, None)
    
    logger.info(f"HasModulePermission check for 'buyers' module: {has_access}")
    if has_access:
        logger.error("ERROR: User still has access to buyers module after removal")
    else:
        logger.info("SUCCESS: User does not have access to buyers module after removal")
    
    # 11. Final verification through direct API call
    logger.info("==== STEP 4: Group permissions via API ====")
    # Get the user's permissions via API
    try:
        # Get token for the test user
        test_token, _ = Token.objects.get_or_create(user=test_user)
        test_headers = {"Authorization": f"Token {test_token.key}"}
        
        # Call the permissions API
        response = requests.get(
            "http://localhost:8000/api/users/me/permissions/",
            headers=test_headers
        )
        
        if response.status_code == 200:
            perms_data = response.json()
            logger.info("User permissions via API:")
            if 'modules' in perms_data:
                logger.info(f"Modules: {perms_data['modules']}")
                if 'buyers' in perms_data['modules']:
                    logger.error("ERROR: 'buyers' module still reported in user permissions via API")
                else:
                    logger.info("SUCCESS: 'buyers' module not found in user permissions via API")
        else:
            logger.error(f"Permissions API call failed: {response.status_code}")
    except Exception as e:
        logger.error(f"Error checking permissions via API: {e}")
    
    # 12. Cleanup
    test_user.delete()
    logger.info(f"Test completed. Cleanup by running: python manage.py moduleperms --sync")

if __name__ == "__main__":
    try:
        test_module_permissions_flow()
        logger.info("Test completed")
    except Exception as e:
        logger.error(f"Error in test script: {e}")
