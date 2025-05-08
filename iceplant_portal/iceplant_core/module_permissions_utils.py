"""
Utility script to persist module permissions to a JSON file
This version uses the enhanced module_permissions_system module.
"""
from iceplant_core.group_permissions import HasModulePermission
import json
import os
import logging

logger = logging.getLogger(__name__)

def save_module_permissions(filename='module_permissions.json'):
    """
    Save the current module permissions to a JSON file
    This function is kept for backward compatibility.
    It now delegates to the new module_permissions_system
    """
    try:
        from iceplant_core.module_permissions_system import save_module_permissions_multi
        success, locations = save_module_permissions_multi()
        return success
    except ImportError:
        # Fall back to the old implementation
        module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
        
        # Use absolute path
        absolute_path = os.path.abspath(filename)
        logger.info(f"Saving module permissions to {absolute_path}")
        
        try:
            # Ensure directory exists
            directory = os.path.dirname(absolute_path)
            if directory and not os.path.exists(directory):
                os.makedirs(directory, exist_ok=True)
                
            # Save to file
            with open(absolute_path, 'w') as f:
                json.dump(module_mapping, f, indent=2)
            
            logger.info(f"Module permissions saved to {absolute_path}")
            return True
        except Exception as e:
            logger.error(f"Error saving module permissions to {absolute_path}: {e}")
            return False

def load_module_permissions(filename='module_permissions.json'):
    """
    Load module permissions from a JSON file
    This function is kept for backward compatibility.
    It now delegates to the new module_permissions_system
    """
    try:
        from iceplant_core.module_permissions_system import load_module_permissions_multi
        return load_module_permissions_multi()
    except ImportError:
        # Fall back to the old implementation
        # Use absolute path
        absolute_path = os.path.abspath(filename)
        logger.info(f"Loading module permissions from {absolute_path}")
        
        if not os.path.exists(absolute_path):
            logger.warning(f"File {absolute_path} does not exist")
            return False
        
        try:
            with open(absolute_path, 'r') as f:
                permissions = json.load(f)
                
            # Update module permissions
            HasModulePermission.MODULE_GROUP_MAPPING.update(permissions)
            logger.info(f"Module permissions loaded successfully from {absolute_path}")
            return True
        except json.JSONDecodeError:
            logger.error(f"File {absolute_path} is not valid JSON")
            return False
        except Exception as e:
            logger.error(f"Error loading module permissions from {absolute_path}: {e}")
            return False

def verify_permissions_loaded():
    """Verify that module permissions were loaded correctly"""
    return HasModulePermission.MODULE_GROUP_MAPPING

def reload_module_permissions():
    """Reload module permissions from disk"""
    try:
        from iceplant_core.module_permissions_system import load_module_permissions_multi
        return load_module_permissions_multi()
    except ImportError:
        return load_module_permissions()

if __name__ == "__main__":
    # By default, save the current permissions
    success = save_module_permissions()
    if success:
        print("Module permissions saved successfully")
    else:
        print("Failed to save module permissions")
