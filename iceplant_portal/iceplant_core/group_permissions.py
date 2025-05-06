from rest_framework import permissions

# Define the mapping between modules and their permissions
MODULE_PERMISSION_MAPPING = {
    'attendance': [
        'attendance.view_attendance',
        'attendance.add_attendance',
        'attendance.change_attendance',
        'attendance.delete_attendance',
        'attendance.view_attendanceapprovallog',
        'attendance.view_departmentshift',
        'attendance.view_employeeprofile',
        'attendance.view_employeeshift',
    ],
    'sales': [
        'sales.view_sale',
        'sales.add_sale',
        'sales.change_sale',
        'sales.delete_sale',
        'sales.view_saleitem',
        'sales.add_saleitem',
        'sales.change_saleitem',
        'sales.delete_saleitem',
    ],
    'inventory': [
        'inventory.view_inventory',
        'inventory.add_inventory',
        'inventory.change_inventory',
        'inventory.delete_inventory',
        'inventory.view_inventoryadjustment',
        'inventory.add_inventoryadjustment',
        'inventory.change_inventoryadjustment',
        'inventory.delete_inventoryadjustment',
    ], 'expenses': [
        'expenses.view_expense',
        'expenses.add_expense',
        'expenses.change_expense',
        'expenses.delete_expense',
        'expenses.view_expensecategory',
        'expenses.add_expensecategory',
        'expenses.change_expensecategory',
        'expenses.delete_expensecategory',
    ],
    'maintenance': [
        'maintenance.view_maintenanceitem',
        'maintenance.add_maintenanceitem',
        'maintenance.change_maintenanceitem',
        'maintenance.delete_maintenanceitem',
        'maintenance.view_maintenancerecord',
        'maintenance.add_maintenancerecord',
        'maintenance.change_maintenancerecord',
        'maintenance.delete_maintenancerecord',
    ],
    'buyers': [
        'buyers.view_buyer',
        'buyers.add_buyer',
        'buyers.change_buyer',
        'buyers.delete_buyer',
    ],
}

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
        # Adding missing modules that appear in the UI but aren't defined in the backend
        'Office': ['Admins'],  
        'HR': ['HR', 'Managers', 'Admins'],
        'HR Payor': ['HR', 'Accounting', 'Admins'],
        'ModuleTest': ['Admins'],
        'CompleteSysTestGroup': ['Admins'],
        'Test Group': ['Admins'],
        'PermissionsTestGroup': ['Admins'],
        'ParameterOrderTestGroup': ['Admins'],
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
