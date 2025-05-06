#!/usr/bin/env python
"""
Direct fix for module permissions not being properly removed.
This script implements a more robust way to handle module permission removal.
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

def fix_direct_permissions():
    """
    Directly clean up permissions based on the module mapping.
    """
    from iceplant_core.group_permissions import HasModulePermission
    from iceplant_core.module_permissions_utils import MODULE_PERMISSION_MAPPING
    
    # Get the current module mapping
    module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
    logger.info("Current module mapping:")
    for module, groups in module_mapping.items():
        logger.info(f"  {module}: {groups}")
    
    # Get all groups
    all_groups = Group.objects.all()
    logger.info(f"Total groups: {all_groups.count()}")
    
    # Process each group
    for group in all_groups:
        logger.info(f"\nProcessing group: {group.name}")
        
        # For each module
        for module, perm_names in MODULE_PERMISSION_MAPPING.items():
            # Check if group should have this module's permissions
            should_have_perms = group.name in module_mapping.get(module, [])
            
            # Get current permissions for this module
            module_perms = []
            for perm_name in perm_names:
                app_label, codename = perm_name.split('.')
                try:
                    perm = Permission.objects.get(
                        content_type__app_label=app_label,
                        codename=codename
                    )
                    module_perms.append(perm)
                except Permission.DoesNotExist:
                    logger.warning(f"Permission {perm_name} does not exist")
            
            # Get permissions this group actually has for this module
            current_perms = [p for p in group.permissions.all() 
                            if any(p.codename == perm.codename and 
                                   p.content_type.app_label == perm.content_type.app_label
                                   for perm in module_perms)]
            
            # If group should have permissions but doesn't
            if should_have_perms and len(current_perms) < len(module_perms):
                logger.info(f"  Adding missing {module} permissions to {group.name}")
                for perm in module_perms:
                    if perm not in current_perms:
                        group.permissions.add(perm)
                        logger.info(f"    Added {perm.content_type.app_label}.{perm.codename}")
            
            # If group should NOT have permissions but does
            elif not should_have_perms and current_perms:
                logger.info(f"  Removing {module} permissions from {group.name}")
                for perm in current_perms:
                    group.permissions.remove(perm)
                    logger.info(f"    Removed {perm.content_type.app_label}.{perm.codename}")
    
    logger.info("\nPermission cleanup completed!")

def fix_api_view_function():
    """
    Fix the API view function to ensure it directly removes permissions.
    """
    api_views_path = '/app/iceplant_portal/users/api_views_groups.py'
    
    if not os.path.exists(api_views_path):
        logger.error(f"API views file not found: {api_views_path}")
        return False
    
    # Create a backup
    import shutil
    backup_path = api_views_path + '.bak2'
    shutil.copy2(api_views_path, backup_path)
    logger.info(f"Created backup at {backup_path}")
    
    # Read the file content
    with open(api_views_path, 'r') as f:
        content = f.read()
    
    # Find the line where permissions should be removed - look for the pattern:
    import re
    pattern = r"# Also remove Django permissions for this module from the group\s+remove_module_permissions_from_group\(module, group_name\)"
    
    modified_content = re.sub(
        pattern,
        """# Also remove Django permissions for this module from the group
                # First try using the utility function
                remove_module_permissions_from_group(module, group_name)
                
                # Double-check by directly removing permissions as well
                try:
                    # Get module permissions
                    from iceplant_core.module_permissions_utils import MODULE_PERMISSION_MAPPING
                    perm_names = MODULE_PERMISSION_MAPPING.get(module, [])
                    
                    # Get the group
                    group_obj = Group.objects.get(name=group_name)
                    
                    # Remove each permission directly
                    for perm_name in perm_names:
                        try:
                            app_label, codename = perm_name.split('.')
                            perm = Permission.objects.get(
                                content_type__app_label=app_label,
                                codename=codename
                            )
                            if perm in group_obj.permissions.all():
                                group_obj.permissions.remove(perm)
                                logger.info(f"Directly removed {perm_name} from {group_name}")
                        except Exception as e:
                            logger.error(f"Error removing {perm_name}: {e}")
                except Exception as e:
                    logger.error(f"Error in direct permission removal: {e}")""",
        content
    )
    
    if modified_content != content:
        # Add missing imports if needed
        if "from django.contrib.auth.models import Group, Permission" not in modified_content:
            import_pattern = r"from django.contrib.auth.models import Group"
            if import_pattern in modified_content:
                modified_content = modified_content.replace(
                    import_pattern,
                    "from django.contrib.auth.models import Group, Permission"
                )
            else:
                # Add it at the top of the file after other imports
                modified_content = modified_content.replace(
                    "from rest_framework import status",
                    "from rest_framework import status\nfrom django.contrib.auth.models import Group, Permission"
                )
        
        # Write the modified content
        with open(api_views_path, 'w') as f:
            f.write(modified_content)
        logger.info("Successfully modified the API view function")
        return True
    else:
        logger.info("No changes needed in API view function")
        return False

if __name__ == "__main__":
    try:
        logger.info("Starting permission fix...")
        
        # First fix the API view to make sure future removals work
        fix_api_view_function()
        
        # Then fix the current permissions
        fix_direct_permissions()
        
        logger.info("Permission fix completed successfully!")
    except Exception as e:
        logger.error(f"Error in script: {e}")
