#!/usr/bin/env python
"""
Direct fix for module permissions.
This script directly fixes permissions in the database.
"""

import os
import sys
import django

# Set up Django environment
sys.path.append("/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "iceplant_core.settings")
django.setup()

import logging
from django.contrib.auth.models import Group, Permission

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

def fix_module_permissions_for_all_groups():
    """Fix module permissions for all groups based on the module mapping"""
    # Get utilities
    from iceplant_core.group_permissions import HasModulePermission
    from iceplant_core.module_permissions_utils import MODULE_PERMISSION_MAPPING
    
    # Get module mapping
    module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
    logger.info(f"Current module mapping: {module_mapping}")
    
    # Get all groups
    groups = Group.objects.all()
    logger.info(f"Found {groups.count()} groups")
    
    # Process each group
    for group in groups:
        logger.info(f"\nProcessing group: {group.name}")
        
        # Process each module
        for module_name, perm_names in MODULE_PERMISSION_MAPPING.items():
            # Check if group should have this module's permissions
            should_have_perms = group.name in module_mapping.get(module_name, [])
            
            # Get module permissions
            module_perms = []
            for perm_name in perm_names:
                try:
                    app_label, codename = perm_name.split('.')
                    perm = Permission.objects.get(
                        content_type__app_label=app_label,
                        codename=codename
                    )
                    module_perms.append(perm)
                except Permission.DoesNotExist:
                    logger.warning(f"Permission {perm_name} does not exist")
                    continue
            
            # Get current permissions for this module
            current_perms = group.permissions.filter(content_type__app_label=module_name)
            
            # If group should have permissions
            if should_have_perms:
                # Check if any are missing
                for perm in module_perms:
                    if perm not in current_perms:
                        group.permissions.add(perm)
                        logger.info(f"  Added {perm.content_type.app_label}.{perm.codename}")
            
            # If group should not have permissions
            else:
                # Remove any existing permissions
                if current_perms.exists():
                    logger.info(f"  Removing {current_perms.count()} permissions for module {module_name}")
                    for perm in current_perms:
                        group.permissions.remove(perm)
                        logger.info(f"    Removed {perm.content_type.app_label}.{perm.codename}")
    
    logger.info("\nFixed all module permissions")

def fix_specific_group_module(group_name, module_name):
    """Fix permissions for a specific group and module"""
    # Get utilities
    from iceplant_core.group_permissions import HasModulePermission
    from iceplant_core.module_permissions_utils import MODULE_PERMISSION_MAPPING
    
    # Get module mapping
    module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
    
    # Get the group
    try:
        group = Group.objects.get(name=group_name)
    except Group.DoesNotExist:
        logger.error(f"Group {group_name} does not exist")
        return False
    
    # Check if the module exists
    if module_name not in MODULE_PERMISSION_MAPPING:
        logger.error(f"Module {module_name} does not exist")
        return False
    
    # Check if group should have this module's permissions
    should_have_perms = group_name in module_mapping.get(module_name, [])
    
    # Get module permissions
    perm_names = MODULE_PERMISSION_MAPPING.get(module_name, [])
    module_perms = []
    
    for perm_name in perm_names:
        try:
            app_label, codename = perm_name.split('.')
            perm = Permission.objects.get(
                content_type__app_label=app_label,
                codename=codename
            )
            module_perms.append(perm)
        except Permission.DoesNotExist:
            logger.warning(f"Permission {perm_name} does not exist")
            continue
    
    # Get current permissions for this module
    current_perms = group.permissions.filter(content_type__app_label=module_name)
    
    logger.info(f"Group {group_name} current permissions for module {module_name}: {current_perms.count()}")
    
    # If group should have permissions
    if should_have_perms:
        logger.info(f"Group {group_name} should have permissions for module {module_name}")
        # Check if any are missing
        for perm in module_perms:
            if perm not in current_perms:
                group.permissions.add(perm)
                logger.info(f"Added {perm.content_type.app_label}.{perm.codename}")
    
    # If group should not have permissions
    else:
        logger.info(f"Group {group_name} should NOT have permissions for module {module_name}")
        # Remove any existing permissions
        if current_perms.exists():
            logger.info(f"Removing {current_perms.count()} permissions for module {module_name}")
            for perm in current_perms:
                group.permissions.remove(perm)
                logger.info(f"Removed {perm.content_type.app_label}.{perm.codename}")
    
    return True

if __name__ == "__main__":
    # Process command line arguments
    if len(sys.argv) == 1:
        # Fix all groups and modules
        logger.info("Fixing permissions for all groups and modules...")
        fix_module_permissions_for_all_groups()
    elif len(sys.argv) == 3:
        # Fix specific group and module
        group_name = sys.argv[1]
        module_name = sys.argv[2]
        logger.info(f"Fixing permissions for group {group_name} and module {module_name}...")
        fix_specific_group_module(group_name, module_name)
    else:
        logger.error("Invalid arguments")
        logger.info("Usage: python fix_permissions.py [group_name module_name]")
        sys.exit(1)
    
    logger.info("Done!")
