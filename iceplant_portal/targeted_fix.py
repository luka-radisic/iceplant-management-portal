#!/usr/bin/env python
"""
Direct targeted fix for the module permissions removal issue.
"""

import os
import sys
import re
import shutil

def fix_api_views():
    """
    Apply a targeted fix to the API views file
    """
    # Path to the API views file
    api_views_path = '/app/iceplant_portal/users/api_views_groups.py'
    
    # Make sure the file exists
    if not os.path.exists(api_views_path):
        print(f"Error: File not found: {api_views_path}")
        return False
    
    # Create a backup
    backup_path = api_views_path + '.targeted.bak'
    try:
        shutil.copy2(api_views_path, backup_path)
        print(f"Created backup at {backup_path}")
    except Exception as e:
        print(f"Error creating backup: {e}")
        return False
    
    # Read the file content
    try:
        with open(api_views_path, 'r') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file: {e}")
        return False
    
    # Look for the specific pattern where permissions are removed
    pattern = r"# Also remove Django permissions for this module from the group\s+remove_module_permissions_from_group\(module, group_name\)"
    
    if not re.search(pattern, content):
        print("Could not find the target pattern for replacement")
        return False
    
    # Replacement code that directly removes permissions
    replacement = """# Also remove Django permissions for this module from the group
                try:
                    # Get the group object
                    group_obj = Group.objects.get(name=group_name)
                    
                    # Get module permissions from the mapping
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
                            if perm in group_obj.permissions.all():
                                group_obj.permissions.remove(perm)
                                logger.info(f"Directly removed {perm_name} from {group_name}")
                        except Exception as e:
                            logger.error(f"Error removing {perm_name}: {e}")
                except Exception as e:
                    logger.error(f"Error directly removing permissions: {e}")"""
    
    # Replace pattern with our fixed code
    modified_content = re.sub(pattern, replacement, content)
    
    # Check if Group is imported
    if "from django.contrib.auth.models import Group" not in modified_content:
        if "from django.contrib.auth.models import" in modified_content:
            # Append to existing import
            modified_content = re.sub(
                r"from django.contrib.auth.models import ([^;]+)",
                r"from django.contrib.auth.models import \1, Group, Permission",
                modified_content
            )
        else:
            # Add new import at the top
            modified_content = "from django.contrib.auth.models import Group, Permission\n" + modified_content
    
    # Write the updated content
    try:
        with open(api_views_path, 'w') as f:
            f.write(modified_content)
        print("Successfully applied the targeted fix")
    except Exception as e:
        print(f"Error writing file: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("Applying targeted fix for module permissions removal...")
    if fix_api_views():
        print("Fix applied successfully!")
    else:
        print("Failed to apply fix")
