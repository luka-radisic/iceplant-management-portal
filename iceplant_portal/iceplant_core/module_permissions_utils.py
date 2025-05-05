"""
Utility script to persist module permissions to a JSON file
"""
from iceplant_core.group_permissions import HasModulePermission
import json
import os

def save_module_permissions(filename='module_permissions.json'):
    """Save the current module permissions to a JSON file"""
    module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
    
    # Save to file
    with open(filename, 'w') as f:
        json.dump(module_mapping, f, indent=2)
    
    print(f"Module permissions saved to {filename}")

def load_module_permissions(filename='module_permissions.json'):
    """Load module permissions from a JSON file"""
    if not os.path.exists(filename):
        print(f"File {filename} does not exist")
        return False
        
    try:
        with open(filename, 'r') as f:
            permissions = json.load(f)
            
        # Update module permissions
        HasModulePermission.MODULE_GROUP_MAPPING.update(permissions)
        print("Module permissions loaded successfully")
        return True
    except json.JSONDecodeError:
        print(f"File {filename} is not valid JSON")
        return False
    except Exception as e:
        print(f"Error loading module permissions: {e}")
        return False

if __name__ == "__main__":
    # By default, save the current permissions
    save_module_permissions()
