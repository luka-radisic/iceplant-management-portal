from rest_framework import permissions
import os
import json
import logging

logger = logging.getLogger(__name__)

# Define standard absolute paths for module_permissions.json
# Corrected paths for Docker environment:
# __file__ is /app/iceplant_portal/iceplant_core/group_permissions.py in the container
DJANGO_PROJECT_DIR_IN_CONTAINER = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # Should be /app/iceplant_portal
PROJECT_ROOT_IN_CONTAINER = os.path.dirname(DJANGO_PROJECT_DIR_IN_CONTAINER) # Should be /app

STANDARD_PERMISSION_PATHS = [
    os.path.join(PROJECT_ROOT_IN_CONTAINER, 'module_permissions.json'),             # e.g., /app/module_permissions.json
    os.path.join(DJANGO_PROJECT_DIR_IN_CONTAINER, 'module_permissions.json'),       # e.g., /app/iceplant_portal/module_permissions.json
    os.path.join(DJANGO_PROJECT_DIR_IN_CONTAINER, 'iceplant_core', 'module_permissions.json'), # e.g., /app/iceplant_portal/iceplant_core/module_permissions.json
]
# Log the determined paths for verification during startup
logger.info(f"STANDARD_PERMISSION_PATHS determined as: {STANDARD_PERMISSION_PATHS}")


# Initialize MODULE_GROUP_MAPPING as an empty dictionary
MODULE_GROUP_MAPPING = {}

# Try to load module permissions from disk on module import
def load_permissions():
    global MODULE_GROUP_MAPPING
    loaded_from_any = False
    for permission_file_path in STANDARD_PERMISSION_PATHS:
        if os.path.exists(permission_file_path):
            try:
                with open(permission_file_path, 'r') as f:
                    saved_permissions = json.load(f)
                MODULE_GROUP_MAPPING.update(saved_permissions) # Update allows merging if multiple files exist, last one wins for conflicts
                logger.info(f"Successfully loaded and updated module permissions from {permission_file_path}")
                loaded_from_any = True # Mark that we loaded from at least one file
            except json.JSONDecodeError as e:
                logger.error(f"Error decoding JSON from {permission_file_path}: {e}")
            except Exception as e:
                logger.error(f"Error loading module permissions from {permission_file_path}: {e}")
        else:
            logger.info(f"Permission file not found at {permission_file_path}. Skipping.")

    if not loaded_from_any:
        logger.warning("No module_permissions.json file found in any standard location. MODULE_GROUP_MAPPING might be empty or rely on defaults if any were defined before this load.")
    # Log the final state of MODULE_GROUP_MAPPING after attempting to load from all paths
    logger.info(f"Final MODULE_GROUP_MAPPING after load attempts: {MODULE_GROUP_MAPPING}")


load_permissions() # Load permissions when the module is imported

class IsInGroups(permissions.BasePermission):
    """
    Permission class that requires the user to be in at least one of the specified groups.
    Usage: 
        permission_classes = [IsInGroups(['Managers', 'Accounting'])]
    """
    
    def __init__(self, groups=None):
        self.groups = groups or []
    
    def has_permission(self, request, view):
        # Superusers always pass
        if request.user.is_superuser:
            return True
            
        # Check if user belongs to any of the required groups
        if not request.user.is_authenticated:
            return False
            
        if not self.groups:  # If no groups specified, deny access
            return False
            
        user_groups = request.user.groups.values_list('name', flat=True)
        return any(group in user_groups for group in self.groups)


class HasModulePermission(permissions.BasePermission):
    """
    Permission class that requires the user to have access to a specific module.
    Modules and their accessible groups are defined in the globally loaded MODULE_GROUP_MAPPING.
    Usage:
        permission_classes = [HasModulePermission('attendance')]
    """
    
    # MODULE_GROUP_MAPPING is now loaded globally above.
    # Default mapping can be removed or kept as a fallback if loading fails and MODULE_GROUP_MAPPING remains empty.
    # For now, we rely on the loading mechanism.
    
    def __init__(self, module=None):
        self.module = module
    
    def has_permission(self, request, view):
        # Superusers always pass
        if request.user.is_superuser:
            return True
            
        if not request.user.is_authenticated:
            return False
            
        if not self.module:
            logger.warning("HasModulePermission called with no module specified.")
            return False
            
        # Use the globally loaded MODULE_GROUP_MAPPING
        allowed_groups = MODULE_GROUP_MAPPING.get(self.module, [])
        if not allowed_groups:
            logger.debug(f"No groups defined for module '{self.module}' or module not found in MODULE_GROUP_MAPPING.")
            return False
            
        user_groups = request.user.groups.values_list('name', flat=True)
        has_perm = any(group in user_groups for group in allowed_groups)
        if not has_perm:
            logger.debug(f"User '{request.user}' denied access to module '{self.module}'. User groups: {list(user_groups)}, Allowed groups: {allowed_groups}")
        return has_perm


class ReadOnly(permissions.BasePermission):
    """
    Permission class that only allows read-only methods.
    Combine with other permissions using | operator.
    """
    
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS
