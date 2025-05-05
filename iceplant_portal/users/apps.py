"""
Script to initialize module permissions on server startup.
This ensures that Django permissions are properly assigned based on module permissions.
"""
import logging
from django.apps import AppConfig
from django.db.models.signals import post_migrate

logger = logging.getLogger(__name__)

def sync_module_permissions(sender, **kwargs):
    """
    Sync module permissions with Django permissions after migrations are applied.
    """
    logger.info("Synchronizing module permissions with Django permissions...")
    
    try:
        from iceplant_core.module_permissions import sync_all_module_permissions
        result = sync_all_module_permissions()
        
        if result:
            logger.info("Successfully synchronized module permissions")
        else:
            logger.error("Failed to synchronize module permissions")
    except Exception as e:
        logger.error(f"Error synchronizing module permissions: {e}")

class ModulePermissionsConfig(AppConfig):
    name = 'users'
    verbose_name = 'User Management'
    
    def ready(self):
        """
        Connect signals when the app is ready.
        """
        # Connect the post_migrate signal to sync_module_permissions
        post_migrate.connect(sync_module_permissions, sender=self)
        
        # Try to sync permissions on startup as well
        try:
            from iceplant_core.module_permissions import sync_all_module_permissions
            sync_all_module_permissions()
        except Exception as e:
            logger.error(f"Error initializing module permissions on startup: {e}")
