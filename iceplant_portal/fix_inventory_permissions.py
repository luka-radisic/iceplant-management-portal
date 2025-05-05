"""
Script to fix the inventory permission mapping
"""

import os
import sys
import django

# Set up Django environment
sys.path.append("/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "iceplant_core.settings")
django.setup()

import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def fix_inventory_permission_mapping():
    """Fix the inventory module permission mapping"""
    try:
        # First check if the file exists
        import iceplant_core.group_permissions
        
        # Create the module mapping dictionary if it doesn't exist
        if not hasattr(iceplant_core.group_permissions, 'MODULE_PERMISSION_MAPPING'):
            logger.info("Creating MODULE_PERMISSION_MAPPING in group_permissions")
            iceplant_core.group_permissions.MODULE_PERMISSION_MAPPING = {}
        
        # Access the mapping
        MODULE_PERMISSION_MAPPING = iceplant_core.group_permissions.MODULE_PERMISSION_MAPPING
        
        # Update the inventory permissions mapping
        inventory_permissions = [
            'inventory.view_inventory',
            'inventory.add_inventory',
            'inventory.change_inventory',
            'inventory.delete_inventory',
            'inventory.view_inventoryadjustment',
            'inventory.add_inventoryadjustment',
            'inventory.change_inventoryadjustment',
            'inventory.delete_inventoryadjustment',
        ]
        
        # Update the mapping
        if 'inventory' in MODULE_PERMISSION_MAPPING:
            old_mapping = MODULE_PERMISSION_MAPPING['inventory']
            MODULE_PERMISSION_MAPPING['inventory'] = inventory_permissions
            logger.info(f"Updated inventory permissions mapping:")
            logger.info(f"  Old: {old_mapping}")
            logger.info(f"  New: {inventory_permissions}")
        else:
            logger.info("Adding inventory to MODULE_PERMISSION_MAPPING")
            MODULE_PERMISSION_MAPPING['inventory'] = inventory_permissions
            logger.info(f"Added inventory permissions: {inventory_permissions}")
        
        return True
            
    except ImportError:
        logger.error("Could not import MODULE_PERMISSION_MAPPING")
        return False
    except Exception as e:
        logger.error(f"Error updating inventory permission mapping: {e}")
        return False

def sync_module_permissions():
    """Sync module permissions with Django permissions"""
    try:
        from iceplant_core.module_permissions_utils import sync_module_permissions
        
        logger.info("Syncing module permissions with Django permissions...")
        sync_module_permissions()
        logger.info("Module permissions synced successfully")
        return True
        
    except ImportError:
        logger.error("Could not import sync_module_permissions")
        return False
    except Exception as e:
        logger.error(f"Error syncing module permissions: {e}")
        return False
    
if __name__ == "__main__":
    logger.info("Fixing inventory permission mapping...")
    
    # Step 1: Fix the mapping
    if fix_inventory_permission_mapping():
        # Step 2: Sync permissions
        sync_module_permissions()
    
    logger.info("Done!")
