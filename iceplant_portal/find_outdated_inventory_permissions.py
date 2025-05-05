"""
Script to fix inventory permissions in HasModulePermission
"""

import os
import sys
import django

# Set up Django environment
sys.path.append("/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "iceplant_core.settings")
django.setup()

import logging
import inspect

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def find_outdated_inventory_permissions():
    """Find where outdated inventory permissions are being used"""
    
    from iceplant_core.group_permissions import MODULE_PERMISSION_MAPPING
    from iceplant_core.module_permissions_utils import assign_module_permissions_to_group
    
    # Verify our correct mapping
    inventory_permissions = MODULE_PERMISSION_MAPPING.get('inventory', [])
    logger.info(f"Current inventory permission mapping: {inventory_permissions}")
    
    # Search for any hardcoded inventoryitem permissions
    try:
        from iceplant_core.group_permissions import HasModulePermission
        for module_name, permission_list in HasModulePermission.__dict__.items():
            if isinstance(permission_list, (list, tuple, dict)) and 'inventoryitem' in str(permission_list):
                logger.info(f"Found inventoryitem reference in HasModulePermission.{module_name}: {permission_list}")
    except Exception as e:
        logger.error(f"Error searching HasModulePermission: {e}")
    
    # Get a list of all Python files in the project
    python_files = []
    for root, dirs, files in os.walk("/app/iceplant_portal"):
        for file in files:
            if file.endswith(".py"):
                python_files.append(os.path.join(root, file))
    
    logger.info(f"Found {len(python_files)} Python files to search")
    
    # Search each file for "inventoryitem" string
    for py_file in python_files:
        try:
            with open(py_file, 'r') as f:
                content = f.read()
                if 'inventoryitem' in content.lower():
                    logger.info(f"Found reference to 'inventoryitem' in: {py_file}")
                    # Print the line containing inventoryitem
                    lines = content.split('\n')
                    for i, line in enumerate(lines):
                        if 'inventoryitem' in line.lower():
                            logger.info(f"  Line {i+1}: {line.strip()}")
        except Exception as e:
            logger.error(f"Error reading {py_file}: {e}")

if __name__ == "__main__":
    logger.info("Finding outdated inventory permissions references...")
    find_outdated_inventory_permissions()
    logger.info("Done!")
