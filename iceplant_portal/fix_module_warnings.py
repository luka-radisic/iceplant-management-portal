#!/usr/bin/env python
"""
A script to fix module permission warnings by updating MODULE_PERMISSION_MAPPING
with all modules from HasModulePermission.MODULE_GROUP_MAPPING.

This script should be run from the Django project root directory.
"""
import os
import sys
import django

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "iceplant_core.settings")
django.setup()

import logging
import json
from django.contrib.auth.models import Group, Permission

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def fix_module_warnings():
    """
    Update MODULE_PERMISSION_MAPPING to include all modules from MODULE_GROUP_MAPPING.
    """
    from iceplant_core.group_permissions import HasModulePermission
    from iceplant_core.module_permissions_utils import MODULE_PERMISSION_MAPPING, save_module_permissions
    
    # Get all modules from GROUP_MAPPING
    group_mapping = HasModulePermission.MODULE_GROUP_MAPPING
    group_modules = set(group_mapping.keys())
    
    # Get all modules from PERMISSION_MAPPING
    permission_mapping = MODULE_PERMISSION_MAPPING
    permission_modules = set(permission_mapping.keys())
    
    # Find modules that exist in GROUP_MAPPING but not in PERMISSION_MAPPING
    missing_modules = group_modules - permission_modules
    
    if missing_modules:
        logger.info(f"Found {len(missing_modules)} modules in GROUP_MAPPING not in PERMISSION_MAPPING:")
        for module in missing_modules:
            logger.info(f"Adding '{module}' to MODULE_PERMISSION_MAPPING with empty permission list")
            MODULE_PERMISSION_MAPPING[module] = []
        
        # Save the updated permission mapping
        try:
            # Get the path to the module_permissions_utils.py file
            import iceplant_core.module_permissions_utils as utils
            module_file = utils.__file__
            
            logger.info(f"Updating {module_file}")
            with open(module_file, 'r') as f:
                content = f.read()
            
            # Find the MODULE_PERMISSION_MAPPING definition
            import re
            pattern = r'(MODULE_PERMISSION_MAPPING\s*=\s*\{[^}]*})'
            match = re.search(pattern, content, re.DOTALL)
            
            if match:
                # Format the updated mapping
                new_mapping = "MODULE_PERMISSION_MAPPING = {\n"
                for module, perms in sorted(MODULE_PERMISSION_MAPPING.items()):
                    new_mapping += f"    '{module}': [\n"
                    for perm in perms:
                        new_mapping += f"        '{perm}',\n"
                    new_mapping += "    ],\n"
                new_mapping += "}"
                
                # Replace the old mapping with the new one
                updated_content = content.replace(match.group(0), new_mapping)
                
                with open(module_file, 'w') as f:
                    f.write(updated_content)
                
                logger.info(f"Updated MODULE_PERMISSION_MAPPING in {module_file}")
            else:
                logger.error("Could not find MODULE_PERMISSION_MAPPING in the file")
        except Exception as e:
            logger.error(f"Error updating module_permissions_utils.py: {e}")
    else:
        logger.info("All modules in GROUP_MAPPING already exist in PERMISSION_MAPPING")
    
    # Save the updated mapping to the JSON file
    save_module_permissions()
    
    return True

if __name__ == "__main__":
    logger.info("Starting module warning fix...")
    if fix_module_warnings():
        logger.info("Module warnings fixed successfully!")
    else:
        logger.error("Error fixing module warnings")
