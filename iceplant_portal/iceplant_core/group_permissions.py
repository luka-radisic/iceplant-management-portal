from rest_framework import permissions

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
    Modules and their accessible groups are defined in a mapping.
    Usage:
        permission_classes = [HasModulePermission('attendance')]
    """
    
    # Define default module-group mapping
    MODULE_GROUP_MAPPING = {
        'attendance': ['HR', 'Managers', 'Admins'],
        'sales': ['Sales', 'Accounting', 'Managers', 'Admins'],
        'inventory': ['Inventory', 'Operations', 'Managers', 'Admins'],
        'expenses': ['Accounting', 'Finance', 'Managers', 'Admins'],
        'maintenance': ['Maintenance', 'Operations', 'Managers', 'Admins'],
        'buyers': ['Sales', 'Accounting', 'Managers', 'Admins'],
    }
    
    # Try to load module permissions from disk on module import
    try:
        import os
        import json
        import logging
        
        logger = logging.getLogger(__name__)
        
        # Check if the permissions file exists
        permission_file = 'module_permissions.json'
        if os.path.exists(permission_file):
            try:
                with open(permission_file, 'r') as f:
                    saved_permissions = json.load(f)
                
                # Update the mapping with saved permissions
                MODULE_GROUP_MAPPING.update(saved_permissions)
                logger.info(f"Loaded module permissions from {permission_file}")
            except Exception as e:
                logger.error(f"Error loading module permissions: {e}")
    except Exception as e:
        # Don't crash if there's an error loading permissions
        pass
    
    def __init__(self, module=None):
        self.module = module
    
    def has_permission(self, request, view):
        # Superusers always pass
        if request.user.is_superuser:
            return True
            
        if not request.user.is_authenticated:
            return False
            
        if not self.module:
            return False
            
        allowed_groups = self.MODULE_GROUP_MAPPING.get(self.module, [])
        if not allowed_groups:
            return False
            
        user_groups = request.user.groups.values_list('name', flat=True)
        return any(group in user_groups for group in allowed_groups)


class ReadOnly(permissions.BasePermission):
    """
    Permission class that only allows read-only methods.
    Combine with other permissions using | operator.
    """
    
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS
