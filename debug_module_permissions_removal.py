#!/usr/bin/env python
"""
Debug script to check why module permissions are not being properly removed.
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

def debug_module_permissions_removal():
    """Debug why module permissions are not being properly removed"""
    from django.contrib.auth.models import Group, User, Permission
    from iceplant_core.group_permissions import HasModulePermission
    from iceplant_core.module_permissions_utils import save_module_permissions
    
    # 1. Check if the JSON file and in-memory mapping are in sync
    logger.info("Current MODULE_GROUP_MAPPING in memory:")
    module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
    logger.info(json.dumps(module_mapping, indent=2))
    
    # 2. Save the current mapping to ensure JSON file is updated
    save_module_permissions()
    
    # 3. Test updating module permissions via direct API call
    group_name = "Test Group"
    
    # Check if group exists
    try:
        group = Group.objects.get(name=group_name)
    except Group.DoesNotExist:
        logger.error(f"Group '{group_name}' does not exist")
        return
    
    # Get current permissions for this group
    permissions = group.permissions.all()
    logger.info(f"Current permissions for '{group_name}':")
    for perm in permissions:
        logger.info(f"  - {perm.content_type.app_label}.{perm.codename}")
    
    # Now let's simulate the frontend API call to remove "buyers" module
    # Get admin token for API auth
    from rest_framework.authtoken.models import Token
    try:
        admin_user = User.objects.get(username="admin", is_superuser=True)
        token, _ = Token.objects.get_or_create(user=admin_user)
        headers = {"Authorization": f"Token {token.key}"}
    except User.DoesNotExist:
        logger.error("No admin user found. Please create an admin user first.")
        return
    
    # Make API call to update module permissions
    try:
        # Set buyers module to False explicitly
        modules_data = {
            "group_name": group_name,
            "modules": {
                "attendance": False,
                "sales": False, 
                "inventory": False,
                "expenses": False,
                "maintenance": False,
                "buyers": False  # Explicitly setting buyers to False
            }
        }
        
        logger.info(f"Making API call to update module permissions with data:")
        logger.info(json.dumps(modules_data, indent=2))
        
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
    except Exception as e:
        logger.error(f"Error making API call: {e}")
    
    # Check permissions and mapping after API call
    try:
        # Refresh group object
        group = Group.objects.get(name=group_name)
        
        logger.info(f"Permissions for '{group_name}' after API call:")
        for perm in group.permissions.all():
            logger.info(f"  - {perm.content_type.app_label}.{perm.codename}")
        
        # Check if module mapping was updated
        logger.info("Updated MODULE_GROUP_MAPPING in memory:")
        logger.info(json.dumps(HasModulePermission.MODULE_GROUP_MAPPING, indent=2))
        
        # Check if the "buyers" module permissions were actually removed
        buyers_perms = [
            p for p in group.permissions.all()
            if p.content_type.app_label == 'buyers'
        ]
        
        if buyers_perms:
            logger.error("The 'buyers' permissions were NOT properly removed! This is the issue.")
            logger.info("Remaining buyers permissions:")
            for perm in buyers_perms:
                logger.info(f"  - buyers.{perm.codename}")
        else:
            logger.info("The 'buyers' permissions were properly removed.")
    except Exception as e:
        logger.error(f"Error checking updated permissions: {e}")
    
    # Let's check the persistence mechanism
    try:
        # Read the JSON file directly
        import os
        json_file = os.path.join(os.getcwd(), "module_permissions.json")
        if os.path.exists(json_file):
            with open(json_file, "r") as f:
                file_data = json.load(f)
            
            logger.info("module_permissions.json file content:")
            logger.info(json.dumps(file_data, indent=2))
            
            # Check if mapping and file are in sync
            in_sync = True
            for module, groups in HasModulePermission.MODULE_GROUP_MAPPING.items():
                file_groups = file_data.get(module, [])
                if sorted(groups) != sorted(file_groups):
                    in_sync = False
                    logger.error(f"Mismatch for module '{module}':")
                    logger.error(f"  In memory: {groups}")
                    logger.error(f"  In file: {file_groups}")
            
            if in_sync:
                logger.info("Memory mapping and JSON file are in sync.")
            else:
                logger.error("Memory mapping and JSON file are NOT in sync. This could be causing persistence issues.")
        else:
            logger.error(f"JSON file not found: {json_file}")
    except Exception as e:
        logger.error(f"Error checking JSON file: {e}")

if __name__ == "__main__":
    try:
        debug_module_permissions_removal()
        logger.info("Debug script completed")
    except Exception as e:
        logger.error(f"Error in debug script: {e}")
