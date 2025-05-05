"""
Complete test for the module permissions system.
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

def test_complete_system():
    """Test the complete module permissions system"""
    from django.contrib.auth.models import Group, User, Permission
    from django.contrib.contenttypes.models import ContentType
    
    # 1. Create a test user and group
    username = "testuser"
    group_name = "CompleteSysTestGroup"
    
    # Get or create a test user
    try:
        user = User.objects.get(username=username)
        logger.info(f"Using existing user {username}")
    except User.DoesNotExist:
        user = User.objects.create_user(
            username=username,
            email="test@example.com",
            password="password123"
        )
        logger.info(f"Created new user {username}")
    
    # Get or create a test group
    try:
        group = Group.objects.get(name=group_name)
        logger.info(f"Using existing group {group_name}")
    except Group.DoesNotExist:
        group = Group.objects.create(name=group_name)
        logger.info(f"Created new group {group_name}")
    
    # Add user to group
    user.groups.add(group)
    logger.info(f"Added {username} to {group_name}")
    
    # 2. Use the module permissions system
    from iceplant_core.group_permissions import HasModulePermission
    from iceplant_core.module_permissions_utils import assign_module_permissions_to_group, sync_module_permissions
    
    # Assign inventory module to the group
    module = "inventory"
    if group_name not in HasModulePermission.MODULE_GROUP_MAPPING.get(module, []):
        HasModulePermission.MODULE_GROUP_MAPPING[module].append(group_name)
        logger.info(f"Added {group_name} to {module} module")
    
    # Sync permissions
    sync_module_permissions()
    
    # 3. Test that the user now has correct permissions
    # Reload the user to get updated permissions
    user = User.objects.get(username=username)
    
    # Check direct permissions
    inventory_view_perm = Permission.objects.get(codename="view_inventory")
    if user.has_perm("inventory.view_inventory"):
        logger.info(f"User {username} has permission to view inventory")
    else:
        logger.error(f"User {username} does NOT have permission to view inventory")
    
    # Check module permissions
    has_module_permission = HasModulePermission(module)
    request_mock = type('Request', (), {'user': user})
    if has_module_permission.has_permission(request_mock, None):
        logger.info(f"HasModulePermission check passed for {username} on {module}")
    else:
        logger.error(f"HasModulePermission check FAILED for {username} on {module}")
    
    # 4. Now remove the module permission and check again
    if group_name in HasModulePermission.MODULE_GROUP_MAPPING.get(module, []):
        HasModulePermission.MODULE_GROUP_MAPPING[module].remove(group_name)
        logger.info(f"Removed {group_name} from {module} module")
    
    # Sync permissions again
    sync_module_permissions()
    
    # Reload the user to get updated permissions
    user = User.objects.get(username=username)
    
    # Check after removal
    if user.has_perm("inventory.view_inventory"):
        logger.error(f"User {username} still has permission to view inventory after removal!")
    else:
        logger.info(f"User {username} correctly lost permission to view inventory")
    
    # Check module permissions again
    has_module_permission = HasModulePermission(module)
    if has_module_permission.has_permission(request_mock, None):
        logger.error(f"HasModulePermission check still passes for {username} on {module} after removal!")
    else:
        logger.info(f"HasModulePermission check correctly fails for {username} on {module} after removal")

if __name__ == "__main__":
    try:
        test_complete_system()
        logger.info("Complete system test finished successfully")
    except Exception as e:
        logger.error(f"Test failed: {e}")
