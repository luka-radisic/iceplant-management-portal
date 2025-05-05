"""
Utility script to work with module permissions
"""
from django.contrib.auth.models import Group, Permission
import logging
import json
import os

logger = logging.getLogger(__name__)
# Set up a default logger if none exists
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(levelname)s: %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

def save_module_permissions(filename='module_permissions.json'):
    """Save the current module permissions to a JSON file"""
    from iceplant_core.group_permissions import HasModulePermission
    module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
    
    # Save to file
    with open(filename, 'w') as f:
        json.dump(module_mapping, f, indent=2)
    
    logger.info(f"Module permissions saved to {filename}")

def load_module_permissions(filename='module_permissions.json'):
    """Load module permissions from a JSON file"""
    if not os.path.exists(filename):
        logger.warning(f"File {filename} does not exist")
        return False
        
    try:
        with open(filename, 'r') as f:
            permissions = json.load(f)
        
        from iceplant_core.group_permissions import HasModulePermission
        # Update module permissions
        HasModulePermission.MODULE_GROUP_MAPPING.update(permissions)
        logger.info(f"Loaded module permissions from {filename}")
        return True
    except json.JSONDecodeError:
        logger.error(f"File {filename} is not valid JSON")
        return False
    except Exception as e:
        logger.error(f"Error loading module permissions: {e}")
        return False

# Define the mapping between modules and their permissions
MODULE_PERMISSION_MAPPING = {
    'attendance': [
        'attendance.view_attendance',
        'attendance.add_attendance',
        'attendance.change_attendance',
        'attendance.delete_attendance',
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
    ],
    'expenses': [
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

def assign_module_permissions_to_group(module, group_name):
    """
    Assign all permissions for a module to a group
    """
    try:
        group = Group.objects.get(name=group_name)
        permissions_assigned = 0
        
        # Get permissions for this module
        module_permissions = MODULE_PERMISSION_MAPPING.get(module, [])
        
        for permission_name in module_permissions:
            try:
                app_label, codename = permission_name.split('.')
                permission = Permission.objects.get(
                    content_type__app_label=app_label,
                    codename=codename
                )
                group.permissions.add(permission)
                permissions_assigned += 1
            except Permission.DoesNotExist:
                logger.warning(f"Permission {permission_name} does not exist")
        
        if permissions_assigned == 0 and module_permissions:
            logger.warning(f"No permissions found for module {module}")
        else:
            logger.info(f"Assigned {permissions_assigned} permissions for module {module} to group {group_name}")
            
    except Group.DoesNotExist:
        logger.warning(f"Group {group_name} does not exist")

def remove_module_permissions_from_group(module, group_name):
    """
    Remove all permissions for a module from a group
    """
    try:
        group = Group.objects.get(name=group_name)
        permissions_removed = 0
        
        # Get permissions for this module
        module_permissions = MODULE_PERMISSION_MAPPING.get(module, [])
        
        for permission_name in module_permissions:
            try:
                app_label, codename = permission_name.split('.')
                permission = Permission.objects.get(
                    content_type__app_label=app_label,
                    codename=codename
                )
                group.permissions.remove(permission)
                permissions_removed += 1
            except Permission.DoesNotExist:
                logger.warning(f"Permission {permission_name} does not exist")
        
        if permissions_removed > 0:
            logger.info(f"Removed {permissions_removed} permissions for module {module} from group {group_name}")
            
    except Group.DoesNotExist:
        logger.warning(f"Group {group_name} does not exist")

def sync_module_permissions():
    """
    Synchronize module-group mapping with Django permissions
    """
    try:
        from iceplant_core.group_permissions import HasModulePermission
        module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
        
        # Get all existing groups
        existing_groups = set(Group.objects.values_list('name', flat=True))
        
        # Process each module
        for module, groups in module_mapping.items():
            # Filter out non-existent groups
            valid_groups = [g for g in groups if g in existing_groups]
            
            if len(valid_groups) != len(groups):
                # Update the mapping if we removed any groups
                module_mapping[module] = valid_groups
            
            # For each group in this module, assign the permissions
            for group_name in valid_groups:
                assign_module_permissions_to_group(module, group_name)
            
            # For each group not in this module, remove the permissions
            for group_name in existing_groups - set(valid_groups):
                remove_module_permissions_from_group(module, group_name)
        
        return True
            
    except Exception as e:
        logger.error(f"Error syncing module permissions: {e}")
        return False

if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    
    # By default, sync permissions and save them
    if sync_module_permissions():
        save_module_permissions()
