"""
Utility script to persist module permissions to a JSON file
"""
from iceplant_core.group_permissions import HasModulePermission
import json
import os
import logging

logger = logging.getLogger(__name__)

def save_module_permissions(filename='module_permissions.json'):
    """Save the current module permissions to a JSON file"""
    module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
    
    # Use absolute path
    absolute_path = os.path.abspath(filename)
    logger.info(f"Saving module permissions to {absolute_path}")
    
    try:
        # Save to file
        with open(absolute_path, 'w') as f:
            json.dump(module_mapping, f, indent=2)
        
        logger.info(f"Module permissions saved to {absolute_path}")
        return True
    except Exception as e:
        logger.error(f"Error saving module permissions to {absolute_path}: {e}")
        return False

def load_module_permissions(filename='module_permissions.json'):
    """Load module permissions from a JSON file"""
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

if __name__ == "__main__":
    # By default, save the current permissions
    success = save_module_permissions()
    if success:
        print("Module permissions saved successfully")
    else:
        print("Failed to save module permissions")
