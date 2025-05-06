"""
Direct script to manually clean up module permissions for Test Group
"""

import os
import sys
import django

# Set up Django environment
sys.path.append("/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "iceplant_core.settings")
django.setup()

import logging
from django.contrib.auth.models import Group, Permission, ContentType

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

def clean_group_permissions():
    """Directly clean up permissions for Test Group"""
    
    # Get the Test Group
    group_name = "Test Group"
    try:
        group = Group.objects.get(name=group_name)
        logger.info(f"Found group {group_name}")
    except Group.DoesNotExist:
        logger.error(f"Group {group_name} does not exist")
        return
    
    # Check existing buyer permissions
    buyers_perms = group.permissions.filter(content_type__app_label='buyers')
    logger.info(f"Found {buyers_perms.count()} buyers permissions for {group_name}")
    
    # Remove all buyers permissions directly
    for perm in buyers_perms:
        group.permissions.remove(perm)
        logger.info(f"Removed permission {perm.content_type.app_label}.{perm.codename} from {group_name}")
    
    # Verify permissions were removed
    remaining = group.permissions.filter(content_type__app_label='buyers')
    if remaining.count() > 0:
        logger.error(f"ERROR: {remaining.count()} buyers permissions remain!")
    else:
        logger.info(f"SUCCESS: All buyers permissions removed from {group_name}")
    
    # Update the module mapping to make sure it's consistent
    from iceplant_core.group_permissions import HasModulePermission
    module_name = "buyers"
    if group_name in HasModulePermission.MODULE_GROUP_MAPPING.get(module_name, []):
        HasModulePermission.MODULE_GROUP_MAPPING[module_name].remove(group_name)
        logger.info(f"Removed {group_name} from {module_name} module mapping")
    
    # Save the changes
    from iceplant_core.module_permissions_utils import save_module_permissions
    save_module_permissions()
    
    # Fix all groups to ensure consistent permissions and module mapping
    all_groups = Group.objects.all()
    modules = ["buyers", "attendance", "sales", "inventory", "expenses", "maintenance"]
    
    for group in all_groups:
        for module in modules:
            # Get the group's permissions for this module
            if group.name in HasModulePermission.MODULE_GROUP_MAPPING.get(module, []):
                logger.info(f"Group {group.name} is in {module} mapping")
            else:
                # Remove all module permissions
                ct = ContentType.objects.filter(app_label=module).first()
                if ct:
                    perms = Permission.objects.filter(content_type__app_label=module)
                    for perm in perms:
                        if perm in group.permissions.all():
                            group.permissions.remove(perm)
                            logger.info(f"Removed stray permission {perm.content_type.app_label}.{perm.codename} from {group.name}")

if __name__ == "__main__":
    logger.info("Starting manual cleanup of Test Group permissions...")
    clean_group_permissions()
    logger.info("Done!")
