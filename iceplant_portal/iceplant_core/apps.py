"""
IceplantCore app configuration
"""
from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)

class IceplantCoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'iceplant_core'
    verbose_name = 'Iceplant Core'

    def ready(self):
        """
        Initialize the module permission system when the Django app is ready.
        This ensures that Django permissions are created for all modules
        and synchronized with the HasModulePermission system.
        """
        # Import here to avoid circular imports
        try:
            from iceplant_core.module_permissions_system import initialize_module_permission_system
            
            # Initialize the module permission system
            # We can't call initialize directly because the models might not be ready yet
            # Use a try/except since we don't want to crash the server startup
            try:
                logger.info("Initializing module permission system during app startup...")
                initialize_module_permission_system()
            except Exception as e:
                logger.error(f"Error initializing module permission system: {e}")
                logger.info("You can manually initialize the system by running: python manage.py sync_module_permissions")
        except ImportError:
            logger.warning("module_permissions_system not available, skipping initialization")
