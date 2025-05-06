"""
Script to fix module permissions in the backend to make sure they are completely removed.
"""

import os
import sys
import django
import inspect

# Set up Django environment
sys.path.append("/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "iceplant_core.settings")
django.setup()

import logging
from django.contrib.auth.models import Group, Permission

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

def fix_module_permissions_removal():
    """Fix the module permissions removal issue in module_permissions_utils.py"""
    from iceplant_core.module_permissions_utils import remove_module_permissions_from_group
    
    # Fix Test Group permissions
    group_name = "Test Group"
    try:
        group = Group.objects.get(name=group_name)
        logger.info(f"Found group '{group_name}'")
        
        # Check buyers permissions
        buyers_perms = [p for p in group.permissions.all() if p.content_type.app_label == 'buyers']
        if buyers_perms:
            logger.info(f"Group '{group_name}' has {len(buyers_perms)} buyers permissions")
            
            # Try to manually remove them
            for perm in buyers_perms:
                group.permissions.remove(perm)
                logger.info(f"Manually removed permission {perm.content_type.app_label}.{perm.codename} from {group_name}")
            
            # Check if they were removed
            group = Group.objects.get(name=group_name)
            remaining_buyers_perms = [p for p in group.permissions.all() if p.content_type.app_label == 'buyers']
            if remaining_buyers_perms:
                logger.error(f"{len(remaining_buyers_perms)} buyers permissions still remain after manual removal!")
            else:
                logger.info("Successfully removed all buyers permissions")
        else:
            logger.info(f"Group '{group_name}' has no buyers permissions")
    except Group.DoesNotExist:
        logger.error(f"Group '{group_name}' does not exist")
        return

if __name__ == "__main__":
    logger.info("Fixing module permissions removal...")
    fix_module_permissions_removal()
    logger.info("Done!")
