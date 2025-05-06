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
    
    # Find the function that has the issue
    import re
    pattern = r'@api_view\(\["POST"\]\)\s+@permission_classes\(\[IsAuthenticated\]\)\s+def update_group_module_permissions\(request\):.*?return Response\(response_data, status=status\.HTTP_200_OK\)'
    
    view_function = re.search(pattern, content, re.DOTALL)
    if not view_function:
        logger.error("Could not find update_group_module_permissions function in the file")
        return False
    
    # The function body to replace
    original_function = view_function.group(0)
    
    # Create the fixed function with direct debugging for now
    fixed_function = """@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_group_module_permissions(request):
    """Update module permissions for a group"""
    import logging
    logger = logging.getLogger(__name__)
    
    # Get utilities
    from iceplant_core.group_permissions import HasModulePermission
    from iceplant_core.module_permissions_utils import assign_module_permissions_to_group
    
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
                
                # Also assign Django permissions for this module to the group
                assign_module_permissions_to_group(module, group_name)
        else:
            # Remove group from module permissions if it's there
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
                        logger.error(f"Error removing {perm_name}: {e}")
                
    # Save the updated permissions mapping to JSON file
    from iceplant_core.module_permissions_utils import save_module_permissions
    save_module_permissions()
    
    # Return response with updated mapping
    response_data = {
        "message": f"Module permissions updated for group '{group_name}'",
        "updated_mapping": module_mapping
    }
    
    return Response(response_data, status=status.HTTP_200_OK)"""
    
    # Replace the function in the content
    new_content = content.replace(original_function, fixed_function)
    
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
