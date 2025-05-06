#!/usr/bin/env python
"""
Hot patch for API views to directly update the database permissions.
"""

import os
import sys
import django
import re

# Set up Django environment
sys.path.append("/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "iceplant_core.settings")
django.setup()

import logging
from django.contrib.auth.models import Group, Permission

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

def create_hotpatch():
    """
    Create a direct hotpatch for the update_group_module_permissions API view.
    """
    # Path to the API view
    api_views_path = '/app/iceplant_portal/users/api_views_groups.py'
    
    if not os.path.exists(api_views_path):
        logger.error(f"API view file not found at {api_views_path}")
        return False
    
    # Create backup
    import shutil
    backup_path = api_views_path + '.bak.final'
    shutil.copy2(api_views_path, backup_path)
    logger.info(f"Created backup at {backup_path}")
    
    # Get module permission utilities
    from iceplant_core.module_permissions_utils import MODULE_PERMISSION_MAPPING
    
    # Create a completely new version of the function
    new_function = """
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_group_module_permissions(request):
    \"\"\"Update module permissions for a group\"\"\"
    import logging
    from django.contrib.auth.models import Group, Permission
    logger = logging.getLogger(__name__)
    
    # Get utilities
    from iceplant_core.group_permissions import HasModulePermission
    from iceplant_core.module_permissions_utils import assign_module_permissions_to_group, MODULE_PERMISSION_MAPPING
    
    logger.info(f"Updating module permissions: {request.data}")
    
    group_name = request.data.get('group_name')
    modules = request.data.get('modules', {})
    
    if not group_name:
        return Response({"error": "Group name is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Check if group exists
        group = Group.objects.get(name=group_name)
    except Group.DoesNotExist:
        return Response({"error": f"Group '{group_name}' does not exist"}, status=status.HTTP_404_NOT_FOUND)
    
    # First, clean up any stale groups in the module mapping
    existing_groups = set(Group.objects.values_list('name', flat=True))
    
    # Update module permissions
    module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
    
    # Clean up first - remove any non-existent groups from all modules
    for module in module_mapping:
        module_mapping[module] = [g for g in module_mapping[module] if g in existing_groups]
    
    # First remove the group from all modules that aren't explicitly set to True
    # This ensures that we handle modules not included in the request
    all_modules = set(module_mapping.keys())
    modules_to_include = {m for m, v in modules.items() if v}
    modules_to_exclude = all_modules - modules_to_include
    
    # Remove group from all modules not explicitly included
    for module in modules_to_exclude:
        if module in module_mapping and group_name in module_mapping[module]:
            module_mapping[module].remove(group_name)
            logger.info(f"Removed {group_name} from {module} (excluded module)")
            
            # DIRECT DATABASE UPDATE: Remove permissions for this module
            perm_names = MODULE_PERMISSION_MAPPING.get(module, [])
            for perm_name in perm_names:
                try:
                    app_label, codename = perm_name.split('.')
                    perm = Permission.objects.get(
                        content_type__app_label=app_label,
                        codename=codename
                    )
                    if perm in group.permissions.all():
                        group.permissions.remove(perm)
                        logger.info(f"Directly removed {perm_name} from {group_name}")
                except Exception as e:
                    logger.error(f"Error removing {perm_name}: {e}")
    
    # Now update the modules based on the request
    for module, has_access in modules.items():
        if module not in module_mapping:
            continue
            
        logger.info(f"Module {module}: {has_access}")
        
        if has_access:
            # Add group to module permissions if not already there
            if group_name not in module_mapping[module]:
                module_mapping[module].append(group_name)
                logger.info(f"Added {group_name} to {module}")
                
                # DIRECT DATABASE UPDATE: Add permissions for this module
                perm_names = MODULE_PERMISSION_MAPPING.get(module, [])
                for perm_name in perm_names:
                    try:
                        app_label, codename = perm_name.split('.')
                        perm = Permission.objects.get(
                            content_type__app_label=app_label,
                            codename=codename
                        )
                        group.permissions.add(perm)
                        logger.info(f"Directly added {perm_name} to {group_name}")
                    except Exception as e:
                        logger.error(f"Error adding {perm_name}: {e}")
        else:
            # Remove group from module permissions if it's there
            if group_name in module_mapping[module]:
                module_mapping[module].remove(group_name)
                logger.info(f"Removed {group_name} from {module}")
                
                # DIRECT DATABASE UPDATE: Remove permissions for this module
                perm_names = MODULE_PERMISSION_MAPPING.get(module, [])
                for perm_name in perm_names:
                    try:
                        app_label, codename = perm_name.split('.')
                        perm = Permission.objects.get(
                            content_type__app_label=app_label,
                            codename=codename
                        )
                        if perm in group.permissions.all():
                            group.permissions.remove(perm)
                            logger.info(f"Directly removed {perm_name} from {group_name}")
                    except Exception as e:
                        logger.error(f"Error removing {perm_name}: {e}")
    
    # Save the updated permissions mapping to JSON file
    from iceplant_core.module_permissions_utils import save_module_permissions
    save_module_permissions()
    
    # Return response with updated mapping
    response_data = {
        "message": f"Module permissions updated for group '{group_name}'",
        "updated_mapping": module_mapping
    }
    
    return Response(response_data, status=status.HTTP_200_OK)
"""
    
    # Read the current file content
    with open(api_views_path, 'r') as f:
        content = f.read()
    
    # Find the current update_group_module_permissions function
    pattern = r'@api_view\(\["POST"\]\)\s*@permission_classes\(\[IsAuthenticated\]\)\s*def update_group_module_permissions\(request\):.*?return Response\(response_data, status=status\.HTTP_200_OK\)'
    
    # Replace the function
    if re.search(pattern, content, re.DOTALL):
        new_content = re.sub(pattern, new_function, content, flags=re.DOTALL)
        
        # Write the updated content
        with open(api_views_path, 'w') as f:
            f.write(new_content)
        
        logger.info("Successfully replaced the update_group_module_permissions function")
        return True
    else:
        logger.error("Could not find the update_group_module_permissions function in the file")
        return False

if __name__ == "__main__":
    try:
        logger.info("Creating hot patch for module permissions API...")
        if create_hotpatch():
            logger.info("Hot patch created successfully!")
        else:
            logger.error("Failed to create hot patch")
    except Exception as e:
        logger.error(f"Error: {e}")
