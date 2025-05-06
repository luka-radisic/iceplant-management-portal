#!/usr/bin/env python
"""
Create direct post-save hook for the update_group_module_permissions API view.
This is a final fix for the module permissions removal issue.
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

def create_post_save_hook():
    """Create a post-save hook for the API view function"""
    # Get source file paths
    api_views_file = '/app/iceplant_portal/users/api_views_groups.py'
    
    # Create backup
    import shutil
    backup_path = api_views_file + '.final_hook.bak'
    shutil.copy2(api_views_file, backup_path)
    logger.info(f"Created backup at {backup_path}")
    
    # Create a post-save function for permissions cleanup
    post_save_function = """
def ensure_permissions_match_mapping():
    \"\"\"
    Ensure all group permissions match the module mapping.
    This function is called after updating module permissions.
    \"\"\"
    import logging
    from django.contrib.auth.models import Group
    from iceplant_core.group_permissions import HasModulePermission
    from iceplant_core.module_permissions_utils import MODULE_PERMISSION_MAPPING
    
    logger = logging.getLogger(__name__)
    
    # For each module, ensure permissions match the mapping
    for module_name, perm_names in MODULE_PERMISSION_MAPPING.items():
        # Get groups that should have this module's permissions
        allowed_groups = set(HasModulePermission.MODULE_GROUP_MAPPING.get(module_name, []))
        
        # Get all groups
        all_groups = Group.objects.all()
        
        # For each group, check if they should have permissions
        for group in all_groups:
            # Check if group should have permissions
            should_have_perms = group.name in allowed_groups
            
            # Get current permissions
            current_perms = group.permissions.filter(content_type__app_label=module_name)
            
            # If group should not have permissions but has some, remove them
            if not should_have_perms and current_perms.exists():
                logger.info(f"Cleaning up: Group {group.name} should not have {module_name} permissions")
                for perm in current_perms:
                    group.permissions.remove(perm)
                    logger.info(f"Removed {perm.content_type.app_label}.{perm.codename}")
"""
    
    # Read the current file content
    with open(api_views_file, 'r') as f:
        content = f.read()
    
    # Check if the function is already there
    if "def ensure_permissions_match_mapping():" in content:
        logger.info("Post-save function already exists, no changes needed")
        return False
    
    # Find the update_group_module_permissions function
    import re
    
    # Add the post-save function
    # We'll add it just before the update_group_module_permissions function
    pattern = r'def update_group_module_permissions\(request\):'
    if not re.search(pattern, content):
        logger.error("Could not find update_group_module_permissions function")
        return False
    
    # Add the function before update_group_module_permissions
    new_content = re.sub(pattern, f"{post_save_function}\n\ndef update_group_module_permissions(request):", content)
    
    # Also add a call to this function at the end of the update_group_module_permissions function
    pattern = r'(return Response\(\{.*?\}, status=status\.HTTP_200_OK\))'
    if not re.search(pattern, new_content, re.DOTALL):
        logger.error("Could not find return statement in update_group_module_permissions function")
        return False
    
    # Add the function call just before the return
    new_content = re.sub(
        pattern, 
        "# Call post-save hook to ensure permissions are clean\n    ensure_permissions_match_mapping()\n\n    \\1", 
        new_content
    )
    
    # Write the modified content
    with open(api_views_file, 'w') as f:
        f.write(new_content)
    
    logger.info("Added post-save hook to update_group_module_permissions function")
    return True

if __name__ == "__main__":
    logger.info("Adding post-save hook to API view function...")
    if create_post_save_hook():
        logger.info("Post-save hook added successfully!")
    else:
        logger.error("Failed to add post-save hook")
