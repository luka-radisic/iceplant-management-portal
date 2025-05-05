"""
Final fix for the inventory permissions mapping.
This script will update the module_permissions.py file to use the correct inventory model names.
"""

import os
import sys
import django

# Set up Django environment
sys.path.append("/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "iceplant_core.settings")
django.setup()

from django.contrib.auth.models import Permission
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def update_group_permissions_file():
    """Update the group_permissions.py file with the correct inventory model names"""
    
    # Path to the group_permissions.py file
    file_path = '/app/iceplant_portal/iceplant_core/group_permissions.py'
    
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return False
    
    # Read the current content
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Get the actual inventory permissions from the database
    inventory_permissions = [
        f"'inventory.{p.codename}'" 
        for p in Permission.objects.filter(content_type__app_label='inventory')
    ]
    
    inventory_perms_str = ",\n        ".join(inventory_permissions)
    
    # Replace the inventory section in MODULE_PERMISSION_MAPPING
    old_inventory_section = """    'inventory': [
        'inventory.view_inventoryitem',
        'inventory.add_inventoryitem',
        'inventory.change_inventoryitem',
        'inventory.delete_inventoryitem',
        'inventory.view_inventoryadjustment',
        'inventory.add_inventoryadjustment',
        'inventory.change_inventoryadjustment',
        'inventory.delete_inventoryadjustment',
    ],"""
    
    new_inventory_section = f"""    'inventory': [
        {inventory_perms_str}
    ],"""
    
    # Also try alternative format
    alt_old_inventory_section = """    'inventory': [
        'inventory.view_inventory',
        'inventory.add_inventory',
        'inventory.change_inventory',
        'inventory.delete_inventory',
        'inventory.view_inventoryadjustment',
        'inventory.add_inventoryadjustment',
        'inventory.change_inventoryadjustment',
        'inventory.delete_inventoryadjustment',
    ],"""
    
    if old_inventory_section in content:
        new_content = content.replace(old_inventory_section, new_inventory_section)
        logger.info("Found standard inventory section format")
    elif alt_old_inventory_section in content:
        new_content = content.replace(alt_old_inventory_section, new_inventory_section)
        logger.info("Found alternative inventory section format")
    else:
        logger.error("Could not find inventory section in the file")
        return False
    
    # Write the updated content
    with open(file_path, 'w') as f:
        f.write(new_content)
    
    logger.info(f"Updated {file_path} with correct inventory permissions")
    return True

if __name__ == "__main__":
    logger.info("Updating group_permissions.py with correct inventory model names...")
    if update_group_permissions_file():
        logger.info("Successfully updated group_permissions.py")
    else:
        logger.error("Failed to update group_permissions.py")
