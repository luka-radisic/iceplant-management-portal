"""
This module sets up signals to automatically fix module warnings on application startup.
"""
from django.apps import AppConfig
from django.db.models.signals import post_migrate
import logging

logger = logging.getLogger(__name__)

def sync_module_mappings(sender, **kwargs):
    """
    Synchronize MODULE_GROUP_MAPPING and MODULE_PERMISSION_MAPPING.
    This ensures all modules in MODULE_GROUP_MAPPING are also in MODULE_PERMISSION_MAPPING.
    """
    from iceplant_core.group_permissions import HasModulePermission
    from iceplant_core.module_permissions_utils import MODULE_PERMISSION_MAPPING, save_module_permissions, sync_module_permissions
    
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
        
        # Save the updated mapping to the JSON file
        save_module_permissions()
        
        # Sync the permissions
        sync_module_permissions()
        
        logger.info("Module mappings synchronized successfully")
    else:
        logger.info("All modules in GROUP_MAPPING already exist in PERMISSION_MAPPING")

class ModulePermissionsConfig(AppConfig):
    name = 'iceplant_core'
    verbose_name = 'Iceplant Core'
    
    def ready(self):
        """
        Connect signals when the application is ready.
        """
        logger.info("Connecting module permissions signals...")
        post_migrate.connect(sync_module_mappings, sender=self)
        logger.info("Module permissions signals connected")

# Register the AppConfig
default_app_config = 'iceplant_core.module_permissions_signals.ModulePermissionsConfig'
