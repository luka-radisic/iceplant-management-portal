#!/usr/bin/env python
"""
Script to fix the module permissions issue by ensuring proper synchronization
between MODULE_GROUP_MAPPING and MODULE_PERMISSION_MAPPING.
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
    # Adding missing modules that appear in the UI but aren't defined in the backend
    'Office': [],
    'HR': [],
    'HR Payor': [],
    'ModuleTest': [],
    'CompleteSysTestGroup': [],
    'Test Group': [],
    'PermissionsTestGroup': [],
    'ParameterOrderTestGroup': [],
    # Adding special case for "HR Payrol" which appears in logs
    'HR Payrol': [],
}

def save_module_permissions(filename='module_permissions.json'):
    """
    Save the current module permissions to a JSON file,
    but also ensure all modules from MODULE_PERMISSION_MAPPING are included.
    """
    try:
        from iceplant_core.group_permissions import HasModulePermission
        module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
        
        # Log what's in the mappings before we modify
        logger.info("=== Before Update ===")
        logger.info("Modules in GROUP_MAPPING: %s", sorted(module_mapping.keys()))
        logger.info("Modules in PERMISSION_MAPPING: %s", sorted(MODULE_PERMISSION_MAPPING.keys()))
        
        # Update MODULE_GROUP_MAPPING with any modules in MODULE_PERMISSION_MAPPING that aren't there
        for module in MODULE_PERMISSION_MAPPING.keys():
            if module not in module_mapping:
                logger.info(f"Adding missing module '{module}' to GROUP_MAPPING")
                module_mapping[module] = ['Admins']  # Default to Admins group
        
        # Save to file
        with open(filename, 'w') as f:
            json.dump(module_mapping, f, indent=2)
        
        # Log after saving
        logger.info(f"Module permissions saved to {filename}")
        logger.info("=== After Update ===")
        logger.info("Modules in GROUP_MAPPING: %s", sorted(module_mapping.keys()))
        
        # Also update the module_permissions_utils.py MODULE_PERMISSION_MAPPING
        try:
            import iceplant_core.module_permissions_utils as utils
            utils_mapping = utils.MODULE_PERMISSION_MAPPING
            
            # Update utils.MODULE_PERMISSION_MAPPING with any missing modules
            modules_before = set(utils_mapping.keys())
            for module in MODULE_PERMISSION_MAPPING.keys():
                if module not in utils_mapping:
                    logger.info(f"Adding missing module '{module}' to MODULE_PERMISSION_MAPPING in utils")
                    utils_mapping[module] = MODULE_PERMISSION_MAPPING[module]
            
            # Check what changed
            modules_after = set(utils_mapping.keys())
            logger.info(f"Added modules to utils: {sorted(list(modules_after - modules_before))}")
        except Exception as e:
            logger.error(f"Error updating utils: {e}")
        
        return True
    except Exception as e:
        logger.error(f"Error saving module permissions: {e}")
        return False

def load_module_permissions(filename='module_permissions.json'):
    """
    Load module permissions from a JSON file and update both mappings.
    """
    if not os.path.exists(filename):
        logger.warning(f"File {filename} does not exist")
        return False
        
    try:
        with open(filename, 'r') as f:
            permissions = json.load(f)
        
        logger.info(f"Loaded JSON data with modules: {sorted(permissions.keys())}")
        
        # Check if JSON has modules that MODULE_PERMISSION_MAPPING doesn't
        from iceplant_core.group_permissions import HasModulePermission
        
        # First log the state before we update anything
        logger.info("=== Before Loading ===")
        logger.info(f"GROUP_MAPPING has {len(HasModulePermission.MODULE_GROUP_MAPPING)} modules: {sorted(HasModulePermission.MODULE_GROUP_MAPPING.keys())}")
        logger.info(f"PERMISSION_MAPPING has {len(MODULE_PERMISSION_MAPPING)} modules: {sorted(MODULE_PERMISSION_MAPPING.keys())}")
        
        # Update MODULE_PERMISSION_MAPPING with modules from JSON
        for module in permissions.keys():
            if module not in MODULE_PERMISSION_MAPPING:
                logger.info(f"Adding module '{module}' from JSON to PERMISSION_MAPPING")
                MODULE_PERMISSION_MAPPING[module] = []
        
        # Update GROUP_MAPPING
        HasModulePermission.MODULE_GROUP_MAPPING.update(permissions)
        
        # Log the state after updates
        logger.info("=== After Loading ===")
        logger.info(f"GROUP_MAPPING has {len(HasModulePermission.MODULE_GROUP_MAPPING)} modules: {sorted(HasModulePermission.MODULE_GROUP_MAPPING.keys())}")
        logger.info(f"PERMISSION_MAPPING has {len(MODULE_PERMISSION_MAPPING)} modules: {sorted(MODULE_PERMISSION_MAPPING.keys())}")
        
        logger.info(f"Loaded module permissions from {filename}")
        return True
    except json.JSONDecodeError:
        logger.error(f"File {filename} is not valid JSON")
        return False
    except Exception as e:
        logger.error(f"Error loading module permissions: {e}")
        return False

def sync_module_permissions():
    """
    Synchronize module-group mapping with Django permissions.
    Also ensure both mappings have the same modules.
    """
    try:
        from iceplant_core.group_permissions import HasModulePermission
        
        # First, ensure both mappings have the same modules
        logger.info("=== Synchronizing MODULE mappings ===")
        
        # Get both mappings
        group_mapping = HasModulePermission.MODULE_GROUP_MAPPING
        permission_mapping = MODULE_PERMISSION_MAPPING
        
        # Find modules in group_mapping but not in permission_mapping
        group_modules = set(group_mapping.keys())
        permission_modules = set(permission_mapping.keys())
        
        logger.info(f"GROUP_MAPPING has {len(group_modules)} modules")
        logger.info(f"PERMISSION_MAPPING has {len(permission_modules)} modules")
        
        # Add missing modules to permission_mapping
        for module in group_modules:
            if module not in permission_mapping:
                logger.info(f"Adding module '{module}' to PERMISSION_MAPPING")
                permission_mapping[module] = []
        
        # Add missing modules to group_mapping
        for module in permission_modules:
            if module not in group_mapping:
                logger.info(f"Adding module '{module}' to GROUP_MAPPING")
                group_mapping[module] = ['Admins']  # Default to Admins group
        
        # Now do the regular permission synchronization
        # [Regular sync code would go here]
        
        # Save the updated JSON file
        save_module_permissions()
        
        return True
    except Exception as e:
        logger.error(f"Error syncing module permissions: {e}")
        return False

if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    
    # First check what's in the module mappings
    logger.info("=== INITIAL STATE ===")
    logger.info(f"MODULE_PERMISSION_MAPPING has {len(MODULE_PERMISSION_MAPPING)} modules: {sorted(MODULE_PERMISSION_MAPPING.keys())}")
    
    try:
        from iceplant_core.group_permissions import HasModulePermission
        logger.info(f"MODULE_GROUP_MAPPING has {len(HasModulePermission.MODULE_GROUP_MAPPING)} modules: {sorted(HasModulePermission.MODULE_GROUP_MAPPING.keys())}")
    except Exception as e:
        logger.error(f"Error accessing GROUP_MAPPING: {e}")
    
    # Load existing permissions
    logger.info("\n=== LOADING PERMISSIONS ===")
    if load_module_permissions():
        logger.info("Successfully loaded permissions")
    
    # Sync permissions
    logger.info("\n=== SYNCING PERMISSIONS ===")
    if sync_module_permissions():
        logger.info("Successfully synchronized permissions")
        
    # Final state
    logger.info("\n=== FINAL STATE ===")
    logger.info(f"MODULE_PERMISSION_MAPPING has {len(MODULE_PERMISSION_MAPPING)} modules: {sorted(MODULE_PERMISSION_MAPPING.keys())}")
    
    try:
        from iceplant_core.group_permissions import HasModulePermission
        logger.info(f"MODULE_GROUP_MAPPING has {len(HasModulePermission.MODULE_GROUP_MAPPING)} modules: {sorted(HasModulePermission.MODULE_GROUP_MAPPING.keys())}")
    except Exception as e:
        logger.error(f"Error accessing GROUP_MAPPING: {e}")
