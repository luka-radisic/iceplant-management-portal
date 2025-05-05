"""
Script to fix the inventory permissions in the module permissions mapping
"""

import os
import sys
import django
import json
import logging

# Set up Django environment
sys.path.append("/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "iceplant_core.settings")
django.setup()

from django.contrib.auth.models import Permission, Group
from django.contrib.contenttypes.models import ContentType

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def get_inventory_permissions():
    """Get all inventory-related permissions from the database"""
    inventory_permissions = []
    
    try:
        # Get all permissions for the inventory app
        permissions = Permission.objects.filter(content_type__app_label='inventory')
        
        if permissions.exists():
            for perm in permissions:
                inventory_permissions.append(f"inventory.{perm.codename}")
            logger.info(f"Found {len(inventory_permissions)} inventory permissions: {inventory_permissions}")
        else:
            logger.warning("No inventory permissions found in database")
            
        return inventory_permissions
            
    except Exception as e:
        logger.error(f"Error getting inventory permissions: {e}")
        return []

def update_module_permission_mapping():
    """Update the MODULE_PERMISSION_MAPPING with actual inventory permissions"""
    try:
        from iceplant_core.group_permissions import MODULE_PERMISSION_MAPPING
        
        # Get all inventory permissions
        inventory_permissions = get_inventory_permissions()
        
        if not inventory_permissions:
            logger.error("No inventory permissions to update")
            return False
        
        # Update the mapping
        old_permissions = MODULE_PERMISSION_MAPPING.get('inventory', [])
        MODULE_PERMISSION_MAPPING['inventory'] = inventory_permissions
        
        logger.info(f"Updated inventory permissions mapping:")
        logger.info(f"Old: {old_permissions}")
        logger.info(f"New: {inventory_permissions}")
        
        # Also update the module_permissions.json file
        update_json_file(inventory_permissions)
        
        return True
        
    except Exception as e:
        logger.error(f"Error updating module permission mapping: {e}")
        return False

def update_json_file(inventory_permissions):
    """Update the inventory permissions in the module_permissions.json file"""
    try:
        json_file = 'module_permissions.json'
        
        if not os.path.exists(json_file):
            logger.warning(f"File {json_file} does not exist")
            return False
        
        with open(json_file, 'r') as f:
            module_mapping = json.load(f)
        
        # Keep the groups that have inventory access
        groups_with_inventory = module_mapping.get('inventory', [])
        
        # Save to file
        with open(json_file, 'w') as f:
            json.dump(module_mapping, f, indent=2)
        
        logger.info(f"Updated inventory permissions in {json_file}")
        return True
        
    except Exception as e:
        logger.error(f"Error updating JSON file: {e}")
        return False

def sync_module_permissions():
    """Sync module permissions with Django permissions"""
    try:
        from iceplant_core.module_permissions_utils import sync_module_permissions as sync_perms
        
        logger.info("Syncing module permissions...")
        sync_perms()
        logger.info("Module permissions synced")
        return True
        
    except Exception as e:
        logger.error(f"Error syncing module permissions: {e}")
        return False

if __name__ == "__main__":
    logger.info("Fixing inventory permissions...")
    
    # Update the module permission mapping
    if update_module_permission_mapping():
        # Sync permissions
        sync_module_permissions()
    
    logger.info("Done!")
