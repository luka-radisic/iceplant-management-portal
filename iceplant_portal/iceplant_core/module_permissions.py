"""
Module to Django Permission mapping system.
This file defines which Django permissions are required for each module.
"""
from django.contrib.auth.models import Permission, Group
from django.contrib.contenttypes.models import ContentType
import logging

logger = logging.getLogger(__name__)

# Define which permissions are required for each module
# Format: 'module_name': [('app_label', 'permission_codename'), ...]
MODULE_PERMISSION_MAPPING = {
    'attendance': [
        ('attendance', 'view_attendance'),
        ('attendance', 'add_attendance'),
        ('attendance', 'change_attendance'),
        ('attendance', 'delete_attendance'),
    ],
    'sales': [
        ('sales', 'view_sale'),
        ('sales', 'add_sale'),
        ('sales', 'change_sale'),
        ('sales', 'delete_sale'),
    ],
    'inventory': [
        ('inventory', 'view_inventory'),
        ('inventory', 'add_inventory'),
        ('inventory', 'change_inventory'),
        ('inventory', 'delete_inventory'),
        ('inventory', 'view_inventoryadjustment'),
        ('inventory', 'add_inventoryadjustment'),
        ('inventory', 'change_inventoryadjustment'),
        ('inventory', 'delete_inventoryadjustment'),
    ],
    'expenses': [
        ('expenses', 'view_expense'),
        ('expenses', 'add_expense'),
        ('expenses', 'change_expense'),
        ('expenses', 'delete_expense'),
    ],
    'maintenance': [
        ('maintenance', 'view_maintenanceitem'),
        ('maintenance', 'add_maintenanceitem'),
        ('maintenance', 'change_maintenanceitem'),
        ('maintenance', 'delete_maintenanceitem'),
        ('maintenance', 'view_maintenancerecord'),
        ('maintenance', 'add_maintenancerecord'),
        ('maintenance', 'change_maintenancerecord'),
        ('maintenance', 'delete_maintenancerecord'),
    ],
    'buyers': [
        ('buyers', 'view_buyer'),
        ('buyers', 'add_buyer'),
        ('buyers', 'change_buyer'),
        ('buyers', 'delete_buyer'),
    ],
}

def get_permission_object(app_label, codename):
    """Get a Permission object based on app_label and codename"""
    try:
        return Permission.objects.get(
            content_type__app_label=app_label,
            codename=codename
        )
    except Permission.DoesNotExist:
        logger.warning(f"Permission {app_label}.{codename} does not exist")
        return None

def get_module_permissions(module_name):
    """Get a list of Permission objects for a module"""
    if module_name not in MODULE_PERMISSION_MAPPING:
        logger.warning(f"Module {module_name} not found in MODULE_PERMISSION_MAPPING")
        return []
    
    permissions = []
    for app_label, codename in MODULE_PERMISSION_MAPPING.get(module_name, []):
        permission = get_permission_object(app_label, codename)
        if permission:
            permissions.append(permission)
    
    return permissions

def assign_module_permissions_to_group(group_name, module_name):
    """Assign all permissions for a module to a group"""
    try:
        group = Group.objects.get(name=group_name)
    except Group.DoesNotExist:
        logger.warning(f"Group {group_name} does not exist")
        return False
    
    permissions = get_module_permissions(module_name)
    if not permissions:
        logger.warning(f"No permissions found for module {module_name}")
        return False
    
    for permission in permissions:
        group.permissions.add(permission)
    
    logger.info(f"Assigned {len(permissions)} permissions for module {module_name} to group {group_name}")
    return True

def remove_module_permissions_from_group(group_name, module_name):
    """Remove all permissions for a module from a group"""
    try:
        group = Group.objects.get(name=group_name)
    except Group.DoesNotExist:
        logger.warning(f"Group {group_name} does not exist")
        return False
    
    permissions = get_module_permissions(module_name)
    if not permissions:
        logger.warning(f"No permissions found for module {module_name}")
        return False
    
    for permission in permissions:
        group.permissions.remove(permission)
    
    logger.info(f"Removed {len(permissions)} permissions for module {module_name} from group {group_name}")
    return True

def sync_all_module_permissions():
    """Sync all module permissions based on the current MODULE_GROUP_MAPPING"""
    from iceplant_core.group_permissions import HasModulePermission
    
    module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
    
    # Get all existing groups
    existing_groups = set(Group.objects.values_list('name', flat=True))
    
    # For each module, ensure the groups have the right permissions
    for module_name, group_names in module_mapping.items():
        # Filter to only existing groups
        valid_group_names = [g for g in group_names if g in existing_groups]
        
        # Get all groups
        all_groups = Group.objects.all()
        
        # For each group, check if it should have the module permissions
        for group in all_groups:
            if group.name in valid_group_names:
                # Group should have module permissions
                assign_module_permissions_to_group(group.name, module_name)
            else:
                # Group should not have module permissions
                remove_module_permissions_from_group(group.name, module_name)
    
    return True
