"""
Direct hotfix for module permission removal issue
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

def hotfix_api_view():
    """Apply a direct hotfix to the API view code"""
    # Path to the views file
    api_views_path = '/app/iceplant_portal/users/api_views_groups.py'
    
    if not os.path.exists(api_views_path):
        logger.error(f"API views file not found: {api_views_path}")
        return False
    
    # Create a backup
    import shutil
    backup_path = api_views_path + '.bak'
    shutil.copy2(api_views_path, backup_path)
    logger.info(f"Created backup at {backup_path}")
    
    # Read the file content
    with open(api_views_path, 'r') as f:
        content = f.read()
    
    # Find the part in the function that needs to be fixed
    import re
    old_snippet = r'''            # Remove group from module permissions if it's there
            if group_name in module_mapping[module]:
                module_mapping[module].remove(group_name)
                logger.info(f"Removed {group_name} from {module}")
                
                # Also remove Django permissions for this module from the group
                remove_module_permissions_from_group(module, group_name)'''
    
    # Replace it with direct permission removal
    new_snippet = r'''            # Remove group from module permissions if it's there
            if group_name in module_mapping[module]:
                module_mapping[module].remove(group_name)
                logger.info(f"Removed {group_name} from {module}")
                
                # IMPORTANT: Directly remove permissions to fix the issue
                # Get module permissions
                from iceplant_core.module_permissions_utils import MODULE_PERMISSION_MAPPING
                perm_names = MODULE_PERMISSION_MAPPING.get(module, [])
                
                # Remove each permission directly
                for perm_name in perm_names:
                    try:
                        app_label, codename = perm_name.split('.')
                        perm = Permission.objects.get(
                            content_type__app_label=app_label,
                            codename=codename
                        )
                        if perm in group.permissions.all():
                            group.permissions.remove(perm)
                            logger.info(f"Explicitly removed {perm_name} from {group_name}")
                    except Exception as e:
                        logger.error(f"Error removing {perm_name}: {e}")'''
    
    # Replace the snippet in the content
    new_content = content.replace(old_snippet, new_snippet)
    
    if new_content == content:
        logger.warning("Could not find the code to replace.")
        return False
        
    # Save the changed file
    with open(api_views_path, 'w') as f:
        f.write(new_content)
    
    logger.info(f"Updated API view in {api_views_path}")
    return True

if __name__ == "__main__":
    logger.info("Applying hotfix to module permissions API view...")
    success = hotfix_api_view()
    if success:
        logger.info("Hotfix applied successfully")
    else:
        logger.error("Failed to apply hotfix")
