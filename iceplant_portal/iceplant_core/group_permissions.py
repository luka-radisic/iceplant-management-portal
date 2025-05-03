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
    
    # Define which groups can access which modules
    MODULE_GROUP_MAPPING = {
        'attendance': ['HR', 'Managers', 'Admins'],
        'sales': ['Sales', 'Accounting', 'Managers', 'Admins'],
        'inventory': ['Inventory', 'Operations', 'Managers', 'Admins'],
        'expenses': ['Accounting', 'Finance', 'Managers', 'Admins'],
        'maintenance': ['Maintenance', 'Operations', 'Managers', 'Admins'],
        'buyers': ['Sales', 'Accounting', 'Managers', 'Admins'],
    }
    
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
