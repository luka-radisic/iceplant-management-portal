#!/usr/bin/env python
"""
Debug script to check the module permission mappings and identify issues.
"""

import os
import sys
import json

# Set up path to Django project
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "iceplant_core.settings")

import django
django.setup()

import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def debug_module_mappings():
    """Debug the module permission mappings to identify why modules are not found."""
    try:
        # First, check the MODULE_PERMISSION_MAPPING directly from the module
        from iceplant_core.module_permissions_utils import MODULE_PERMISSION_MAPPING as direct_mapping
        logger.info("=== Direct MODULE_PERMISSION_MAPPING Keys ===")
        for key in sorted(direct_mapping.keys()):
            logger.info(f"Module in direct mapping: '{key}'")
        
        # Check if module_permissions.json exists and what it contains
        json_file = 'module_permissions.json'
        if os.path.exists(json_file):
            logger.info(f"\n=== Content of {json_file} ===")
            try:
                with open(json_file, 'r') as f:
                    json_data = json.load(f)
                    logger.info(f"JSON file type: {type(json_data)}")
                    for key in sorted(json_data.keys()):
                        logger.info(f"Module in JSON: '{key}'")
                    
                    # Check if the JSON file overwrites our modules
                    for key in direct_mapping.keys():
                        if key not in json_data:
                            logger.info(f"Module '{key}' in direct mapping but NOT in JSON")
            except Exception as e:
                logger.error(f"Error reading JSON file: {e}")
        else:
            logger.info(f"JSON file {json_file} does not exist")
        
        # Check the module group mapping
        from iceplant_core.group_permissions import HasModulePermission
        group_mapping = HasModulePermission.MODULE_GROUP_MAPPING
        logger.info("\n=== MODULE_GROUP_MAPPING Keys ===")
        for key in sorted(group_mapping.keys()):
            logger.info(f"Module in group mapping: '{key}'")
        
        # Compare the two mappings
        logger.info("\n=== Comparison ===")
        for key in sorted(group_mapping.keys()):
            if key not in direct_mapping:
                logger.info(f"Module '{key}' in GROUP_MAPPING but NOT in PERMISSION_MAPPING")
        
        for key in sorted(direct_mapping.keys()):
            if key not in group_mapping:
                logger.info(f"Module '{key}' in PERMISSION_MAPPING but NOT in GROUP_MAPPING")
        
        # Check for case sensitivity issues
        logger.info("\n=== Case Sensitivity Check ===")
        lowercase_group_keys = [k.lower() for k in group_mapping.keys()]
        for key in direct_mapping.keys():
            if key.lower() in lowercase_group_keys and key not in group_mapping:
                logger.info(f"Possible case mismatch: '{key}' vs {[k for k in group_mapping.keys() if k.lower() == key.lower()]}")
        
        # Check when module_permissions.json is loaded and how it modifies the mappings
        logger.info("\n=== Check Module Loading Sequence ===")
        
        try:
            # Manually load the module permissions and compare
            from iceplant_core.module_permissions_utils import load_module_permissions, MODULE_PERMISSION_MAPPING
            
            # Save a copy of the current mapping
            mapping_before = set(MODULE_PERMISSION_MAPPING.keys())
            logger.info(f"Modules before loading: {sorted(list(mapping_before))}")
            
            # Load the permissions from JSON
            if load_module_permissions():
                mapping_after = set(MODULE_PERMISSION_MAPPING.keys())
                logger.info(f"Modules after loading: {sorted(list(mapping_after))}")
                
                added = mapping_after - mapping_before
                removed = mapping_before - mapping_after
                
                if added:
                    logger.info(f"Modules added by JSON: {sorted(list(added))}")
                if removed:
                    logger.info(f"Modules removed by JSON: {sorted(list(removed))}")
            else:
                logger.info("Failed to load module permissions from JSON")
        except Exception as e:
            logger.error(f"Error testing module loading: {e}")
    
    except Exception as e:
        logger.error(f"Error debugging module mappings: {e}")

if __name__ == "__main__":
    logger.info("Starting module mapping debug")
    debug_module_mappings()
    logger.info("Debug complete")
