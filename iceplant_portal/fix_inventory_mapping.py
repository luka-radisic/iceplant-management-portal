#!/usr/bin/env python
"""
Script to fix the inventory permissions in the module permissions mapping.
"""
import os
import sys
import django
import json

# Set up Django environment
sys.path.append('/app')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "iceplant_core.settings")
django.setup()

import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def fix_inventory_permissions():
    """
    Fix the inventory module permissions in MODULE_PERMISSION_MAPPING
    """
    from iceplant_core.group_permissions import MODULE_PERMISSION_MAPPING
    from django.contrib.auth.models import Permission

    # Get the actual inventory permissions from the database
    inventory_permissions = Permission.objects.filter(
        content_type__app_label='inventory'
    ).values_list('content_type__app_label', 'codename')
    
    # Create the corrected mapping
    corrected_permissions = [
        f"{app_label}.{codename}" 
        for app_label, codename in inventory_permissions
    ]
    
    # Update the module permissions mapping
    old_mapping = MODULE_PERMISSION_MAPPING.get('inventory', [])
    MODULE_PERMISSION_MAPPING['inventory'] = corrected_permissions
    
    logger.info("Updated inventory permissions mapping:")
    logger.info(f"Old mapping: {old_mapping}")
    logger.info(f"New mapping: {corrected_permissions}")
    
    # Save the updated mapping to the module_permissions.json file
    from iceplant_core.module_permissions_utils import save_module_permissions
    save_module_permissions()
    
    # Sync the permissions
    from iceplant_core.module_permissions_utils import sync_module_permissions
    sync_module_permissions()
    
    return True

if __name__ == "__main__":
    logger.info("Fixing inventory permissions mapping...")
    if fix_inventory_permissions():
        logger.info("Successfully fixed inventory permissions mapping")
    else:
        logger.error("Failed to fix inventory permissions mapping")
