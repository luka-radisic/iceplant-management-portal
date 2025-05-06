#!/usr/bin/env python
"""
This script verifies the module mappings and synchronizes the module permissions.
It helps identify and fix any inconsistencies between MODULE_GROUP_MAPPING and MODULE_PERMISSION_MAPPING.
"""
import os
import sys
import django
import logging

# Set up Django environment
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "iceplant_portal")))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "iceplant_core.settings")
django.setup()

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def verify_module_mappings():
    """
    Verify that all modules in MODULE_GROUP_MAPPING are in MODULE_PERMISSION_MAPPING and vice versa.
    """
    from iceplant_core.group_permissions import HasModulePermission
    from iceplant_core.module_permissions_utils import MODULE_PERMISSION_MAPPING
    
    group_mapping = HasModulePermission.MODULE_GROUP_MAPPING
    permission_mapping = MODULE_PERMISSION_MAPPING
    
    # Check for modules in group mapping but not in permission mapping
    group_modules = set(group_mapping.keys())
    permission_modules = set(permission_mapping.keys())
    
    missing_in_permissions = group_modules - permission_modules
    missing_in_groups = permission_modules - group_modules
    
    logger.info("=== Module Mapping Verification ===")
    
    if missing_in_permissions:
        logger.warning(f"Modules in GROUP_MAPPING but missing in PERMISSION_MAPPING: {missing_in_permissions}")
    else:
        logger.info("All modules in GROUP_MAPPING are also in PERMISSION_MAPPING.")
    
    if missing_in_groups:
        logger.warning(f"Modules in PERMISSION_MAPPING but missing in GROUP_MAPPING: {missing_in_groups}")
    else:
        logger.info("All modules in PERMISSION_MAPPING are also in GROUP_MAPPING.")
    
    # Verify each module's permissions
    logger.info("\n=== Module Permissions Detail ===")
    for module in sorted(permission_modules):
        perms = permission_mapping.get(module, [])
        logger.info(f"Module '{module}': {len(perms)} permission(s)")
        if not perms:
            logger.warning(f"  WARNING: Module '{module}' has no permissions defined")

def sync_modules():
    """
    Synchronize module permissions based on the current mapping.
    """
    from iceplant_core.module_permissions_utils import sync_module_permissions, save_module_permissions
    
    logger.info("\n=== Synchronizing Module Permissions ===")
    if sync_module_permissions():
        save_module_permissions()
        logger.info("Module permissions synchronized and saved successfully.")
    else:
        logger.error("Error synchronizing module permissions.")

if __name__ == "__main__":
    logger.info("Starting module mapping verification...")
    verify_module_mappings()
    sync_modules()
    logger.info("Done!")
