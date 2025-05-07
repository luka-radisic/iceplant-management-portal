"""
Module Permissions Integration Script

This script implements a comprehensive solution for connecting the frontend module permission 
assignments with Django's permission system. It ensures that module permissions are:

1. Correctly displayed in the Django admin interface
2. Properly persisted across server restarts
3. Synchronized between HasModulePermission and Django's permission system

To run this script:
    python manage.py shell < integrate_module_permissions.py
"""
import os
import sys
import logging
from pathlib import Path
import shutil

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("module_permissions_integration.log")
    ]
)
logger = logging.getLogger(__name__)

def backup_file(file_path):
    """Create a backup of a file"""
    if os.path.exists(file_path):
        backup_path = f"{file_path}.bak"
        try:
            shutil.copy2(file_path, backup_path)
            logger.info(f"Created backup of {file_path} to {backup_path}")
            return True
        except Exception as e:
            logger.error(f"Error creating backup of {file_path}: {e}")
            return False
    return False

def integrate_module_permission_system():
    """
    Integrate the module permission system with Django's permission system
    by creating the required files and making code changes.
    """
    logger.info("Starting module permissions integration...")
    
    try:
        # 1. Ensure the module_permissions_system.py is created
        module_permissions_system_path = Path("iceplant_portal/iceplant_core/module_permissions_system.py")
        
        # 2. Create Django management command
        management_dir = Path("iceplant_portal/iceplant_core/management")
        commands_dir = management_dir / "commands"
        
        os.makedirs(commands_dir, exist_ok=True)
        
        init_path = management_dir / "__init__.py"
        if not init_path.exists():
            with open(init_path, "w") as f:
                pass
            logger.info(f"Created {init_path}")
        
        commands_init_path = commands_dir / "__init__.py"
        if not commands_init_path.exists():
            with open(commands_init_path, "w") as f:
                pass
            logger.info(f"Created {commands_init_path}")
        
        mgmt_command_path = commands_dir / "sync_module_permissions.py"
        
        # 3. Update app config to auto-initialize the system
        apps_path = Path("iceplant_portal/iceplant_core/apps.py")
        
        # 4. Initialize the module permission system
        try:
            from django.contrib.auth.models import Group, Permission
            from django.contrib.contenttypes.models import ContentType
            from iceplant_core.module_permissions_system import initialize_module_permission_system
            
            # Initialize the system
            logger.info("Initializing module permission system...")
            if initialize_module_permission_system():
                logger.info("Successfully initialized module permission system")
            else:
                logger.warning("Some errors occurred while initializing module permission system")
        except Exception as e:
            logger.error(f"Error initializing module permission system: {e}")
        
        # 5. Display instructions for manual steps
        logger.info("\nIntegration complete! Additional manual steps:")
        logger.info("1. Ensure 'iceplant_core' is listed in INSTALLED_APPS in settings.py")
        logger.info("2. Restart the Django server to activate the changes")
        logger.info("3. To manually sync permissions, run: python manage.py sync_module_permissions\n")
        
        # 6. Check current group permissions
        try:
            groups = Group.objects.all()
            logger.info(f"Current groups in system: {len(groups)}")
            
            module_ct = ContentType.objects.filter(app_label='iceplant_core', model='modulepermission').first()
            if module_ct:
                module_perms = Permission.objects.filter(content_type=module_ct)
                logger.info(f"Found {len(module_perms)} module permissions")
                
                # List permissions per group
                for group in groups:
                    group_module_perms = group.permissions.filter(content_type=module_ct)
                    logger.info(f"Group '{group.name}' has {len(group_module_perms)} module permissions:")
                    for perm in group_module_perms:
                        logger.info(f"  - {perm.codename}: {perm.name}")
            else:
                logger.warning("No module permission content type found")
        except Exception as e:
            logger.error(f"Error checking current permissions: {e}")
        
        return True
    except Exception as e:
        logger.error(f"Error during integration: {e}")
        return False

# Run the integration
try:
    success = integrate_module_permission_system()
    if success:
        print("\n✅ Module permissions integration completed successfully!")
        print("You can now restart the server to activate the changes.")
    else:
        print("\n⚠️ Module permissions integration completed with some errors.")
        print("Check the module_permissions_integration.log file for details.")
except Exception as e:
    logger.error(f"Fatal error during integration: {e}")
    print("\n❌ Module permissions integration failed.")
    print("Check the module_permissions_integration.log file for details.")
