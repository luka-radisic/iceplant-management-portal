"""
Utility script to persist module permissions to a JSON file
This version uses the enhanced module_permissions_system module.
"""
import json
import os
import logging

# Import the global MODULE_GROUP_MAPPING and STANDARD_PERMISSION_PATHS from group_permissions
from iceplant_core.group_permissions import MODULE_GROUP_MAPPING, STANDARD_PERMISSION_PATHS, load_permissions as reload_module_permissions_from_source

logger = logging.getLogger(__name__)

def save_module_permissions():
    """
    Save the current in-memory MODULE_GROUP_MAPPING to all standard JSON file locations.
    Ensures directories are created if they don't exist.
    """
    success_all_locations = True
    saved_locations = []
    failed_locations = []

    if not MODULE_GROUP_MAPPING:
        logger.warning("MODULE_GROUP_MAPPING is empty. Saving an empty permission set.")

    for permission_file_path in STANDARD_PERMISSION_PATHS:
        try:
            # Ensure directory exists
            directory = os.path.dirname(permission_file_path)
            if directory and not os.path.exists(directory):
                os.makedirs(directory, exist_ok=True)
                logger.info(f"Created directory: {directory}")
                
            # Save to file
            with open(permission_file_path, 'w') as f:
                json.dump(MODULE_GROUP_MAPPING, f, indent=2)
            
            logger.info(f"Module permissions successfully saved to {permission_file_path}")
            saved_locations.append(permission_file_path)
        except Exception as e:
            logger.error(f"Error saving module permissions to {permission_file_path}: {e}")
            failed_locations.append(permission_file_path)
            success_all_locations = False
            
    if success_all_locations:
        logger.info(f"Module permissions saved to all standard locations: {saved_locations}")
    else:
        logger.error(f"Failed to save module permissions to some locations. Saved: {saved_locations}, Failed: {failed_locations}")
        
    return success_all_locations, saved_locations

# Helper functions to manage permissions in memory and trigger save

def get_module_permissions():
    """Returns the current in-memory module permissions mapping."""
    return MODULE_GROUP_MAPPING

def update_module_group_assignment(module_name, groups):
    """
    Updates the list of groups assigned to a specific module.
    Saves the changes to disk.
    Args:
        module_name (str): The name of the module to update.
        groups (list): A list of group names to assign to the module.
    """
    global MODULE_GROUP_MAPPING
    if not isinstance(groups, list):
        logger.error(f"Groups must be a list. Received: {type(groups)}")
        return False, "Groups must be a list."
    
    MODULE_GROUP_MAPPING[module_name] = groups
    logger.info(f"Updated module '{module_name}' with groups: {groups}. Current mapping: {MODULE_GROUP_MAPPING}")
    success, _ = save_module_permissions()
    if success:
        logger.info(f"Successfully saved changes for module '{module_name}' to disk.")
    else:
        logger.error(f"Failed to save changes for module '{module_name}' to disk.")
    return success, f"Permissions for {module_name} updated."

def add_group_to_module(module_name, group_name):
    """
    Adds a single group to a module's permission list.
    Saves the changes to disk.
    """
    global MODULE_GROUP_MAPPING
    if module_name not in MODULE_GROUP_MAPPING:
        MODULE_GROUP_MAPPING[module_name] = []
    
    if group_name not in MODULE_GROUP_MAPPING[module_name]:
        MODULE_GROUP_MAPPING[module_name].append(group_name)
        logger.info(f"Added group '{group_name}' to module '{module_name}'. Current mapping: {MODULE_GROUP_MAPPING}")
        success, _ = save_module_permissions()
        return success
    logger.info(f"Group '{group_name}' already in module '{module_name}'. No change made.")
    return True # Considered success as the state is already as desired

def remove_group_from_module(module_name, group_name):
    """
    Removes a single group from a module's permission list.
    Saves the changes to disk.
    """
    global MODULE_GROUP_MAPPING
    if module_name in MODULE_GROUP_MAPPING and group_name in MODULE_GROUP_MAPPING[module_name]:
        MODULE_GROUP_MAPPING[module_name].remove(group_name)
        logger.info(f"Removed group '{group_name}' from module '{module_name}'. Current mapping: {MODULE_GROUP_MAPPING}")
        success, _ = save_module_permissions()
        return success
    logger.info(f"Group '{group_name}' not found in module '{module_name}' or module does not exist. No change made.")
    return True # Considered success as the state is already as desired or non-actionable

def reload_module_permissions():
    """
    Reload module permissions from disk by calling the loader in group_permissions.
    This ensures that the global MODULE_GROUP_MAPPING in group_permissions is updated.
    """
    logger.info("Reloading module permissions from source files...")
    reload_module_permissions_from_source() # This function re-populates MODULE_GROUP_MAPPING
    logger.info(f"Module permissions reloaded. Current mapping: {MODULE_GROUP_MAPPING}")
    return True

def set_modules_for_group(group_name, assigned_modules_for_this_group):
    """
    Sets the list of modules a specific group has access to.
    This will update the entire MODULE_GROUP_MAPPING accordingly.
    Saves the changes to disk.
    Args:
        group_name (str): The name of the group to update permissions for.
        assigned_modules_for_this_group (list): A list of module names this group should have access to.
    """
    global MODULE_GROUP_MAPPING
    if not isinstance(assigned_modules_for_this_group, list):
        logger.error(f"Assigned modules must be a list. Received: {type(assigned_modules_for_this_group)}")
        return False, "Assigned modules must be a list."

    logger.info(f"Setting modules for group '{group_name}' to: {assigned_modules_for_this_group}. Current mapping before update: {MODULE_GROUP_MAPPING}")

    # Ensure all modules in assigned_modules_for_this_group exist in mapping and have the group
    for module_name in assigned_modules_for_this_group:
        if module_name not in MODULE_GROUP_MAPPING:
            MODULE_GROUP_MAPPING[module_name] = [group_name]
            logger.debug(f"Created new module '{module_name}' and assigned group '{group_name}'.")
        else:
            if group_name not in MODULE_GROUP_MAPPING[module_name]:
                MODULE_GROUP_MAPPING[module_name].append(group_name)
                logger.debug(f"Added group '{group_name}' to existing module '{module_name}'.")

    # Remove the group from modules not in assigned_modules_for_this_group
    # Iterate over a copy of keys for safe modification if modules themselves were removed (not the case here)
    for module_name in list(MODULE_GROUP_MAPPING.keys()):
        if module_name not in assigned_modules_for_this_group:
            if group_name in MODULE_GROUP_MAPPING[module_name]:
                MODULE_GROUP_MAPPING[module_name].remove(group_name)
                logger.debug(f"Removed group '{group_name}' from module '{module_name}' as it's no longer assigned to the group.")
                # Optional: Clean up empty modules if a module has no groups left
                # if not MODULE_GROUP_MAPPING[module_name]:
                #     del MODULE_GROUP_MAPPING[module_name]
                #     logger.debug(f"Removed module '{module_name}' as it has no assigned groups left.")


    logger.info(f"Updated MODULE_GROUP_MAPPING after setting modules for group '{group_name}': {MODULE_GROUP_MAPPING}")
    success, _ = save_module_permissions()
    if success:
        logger.info(f"Successfully saved changes for group '{group_name}' module assignments to disk.")
    else:
        logger.error(f"Failed to save changes for group '{group_name}' module assignments to disk.")
    return success, f"Permissions for group {group_name} updated."

# The old load_module_permissions can be removed or adapted
# For now, let's remove the old load_module_permissions as reloading is handled by reload_module_permissions
# and initial loading is handled in group_permissions.py

def verify_permissions_loaded():
    """Verify that module permissions were loaded correctly by checking the live mapping."""
    logger.info(f"Verifying permissions. Current MODULE_GROUP_MAPPING: {MODULE_GROUP_MAPPING}")
    return MODULE_GROUP_MAPPING

if __name__ == "__main__":
    # Example usage:
    logger.info("Running module_permissions_utils.py script example...")
    
    # Verify initial load (should reflect what group_permissions.py loaded)
    print("Initial permissions:", verify_permissions_loaded())
    
    # Update permissions for a module using the older function
    print("Updating 'sales' module permissions using update_module_group_assignment...")
    update_module_group_assignment('sales', ['Sales Team', 'Managers', 'Admins'])
    print("Permissions after update_module_group_assignment for 'sales':", get_module_permissions())
    
    # Add a group to a module
    print("Adding 'Support' to 'attendance' module...")
    add_group_to_module('attendance', 'Support')
    print("Permissions after adding group 'Support' to 'attendance':", get_module_permissions())
    
    # Remove a group from a module
    print("Removing 'Managers' from 'sales' module...")
    remove_group_from_module('sales', 'Managers')
    print("Permissions after removing group 'Managers' from 'sales':", get_module_permissions())

    # Test the new set_modules_for_group function
    print("Setting modules for group 'HR Payrol' to ['attendance', 'expenses']...")
    set_modules_for_group('HR Payrol', ['attendance', 'expenses'])
    print("Permissions after setting modules for 'HR Payrol':", get_module_permissions())

    print("Setting modules for group 'Accountants' to ['expenses', 'buyers']...")
    set_modules_for_group('Accountants', ['expenses', 'buyers'])
    print("Permissions after setting modules for 'Accountants':", get_module_permissions())
    
    print("Re-setting modules for group 'HR Payrol' to just ['attendance']...")
    set_modules_for_group('HR Payrol', ['attendance'])
    print("Permissions after re-setting modules for 'HR Payrol':", get_module_permissions())


    # Reload permissions from file (simulates a manual reload request)
    # For this to show a change, you'd manually edit one of the .json files before this call
    # print("Reloading permissions from files...")
    # reload_module_permissions()
    # print("Permissions after reload:", get_module_permissions())

    print("Script example finished.")
