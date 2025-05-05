"""
Test the module permissions functionality by creating a new group and assigning modules to it.
"""

import os
import sys
import django
import json
import logging

# Set up Django environment
sys.path.append("/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "iceplant_core.settings")
django.setup()

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

from django.contrib.auth.models import Group, Permission

def test_module_permissions_system():
    """Test the module permissions system"""
    from iceplant_core.group_permissions import HasModulePermission, MODULE_PERMISSION_MAPPING
    from iceplant_core.module_permissions_utils import assign_module_permissions_to_group, remove_module_permissions_from_group
    
    logger.info("Testing module permissions system...")
    
    # 1. Create a test group
    test_group_name = "ModuleTest"
    try:
        test_group = Group.objects.get(name=test_group_name)
        logger.info(f"Using existing group '{test_group_name}'")
    except Group.DoesNotExist:
        test_group = Group.objects.create(name=test_group_name)
        logger.info(f"Created new group '{test_group_name}'")
    
    # 2. Assign inventory module to test group
    module = "inventory"
    if test_group_name not in HasModulePermission.MODULE_GROUP_MAPPING.get(module, []):
        HasModulePermission.MODULE_GROUP_MAPPING[module].append(test_group_name)
        logger.info(f"Added '{test_group_name}' to module '{module}'")
    
    # 3. Assign permissions for the inventory module to the group
    assign_module_permissions_to_group(module, test_group_name)
    
    # 4. Verify that the group has the correct permissions
    permission_names = MODULE_PERMISSION_MAPPING.get(module, [])
    
    group_perms = test_group.permissions.all()
    group_perm_names = [f"{p.content_type.app_label}.{p.codename}" for p in group_perms]
    
    logger.info(f"Permissions for group '{test_group_name}':")
    for perm in group_perm_names:
        logger.info(f"  - {perm}")
    
    missing_perms = [p for p in permission_names if p not in group_perm_names]
    if missing_perms:
        logger.error(f"Missing permissions: {missing_perms}")
    else:
        logger.info(f"All required permissions assigned successfully")
    
    # 5. Test remove permissions
    remove_module_permissions_from_group(module, test_group_name)
    
    # 6. Verify permissions were removed
    test_group.refresh_from_db()
    remaining_perms = [f"{p.content_type.app_label}.{p.codename}" 
                     for p in test_group.permissions.all()]
    
    module_perms = [p for p in remaining_perms 
                  if p.startswith(f"{module}.")]
    
    if module_perms:
        logger.error(f"Permissions were not properly removed: {module_perms}")
    else:
        logger.info(f"All {module} permissions removed successfully")
    
if __name__ == "__main__":
    test_module_permissions_system()
    logger.info("Test completed successfully")
