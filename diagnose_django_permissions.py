"""
Django management command to diagnose module permissions issue
"""
import os
import sys
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    """Run the diagnostic inside Django context"""
    try:
        # Add the iceplant_portal directory to the path
        current_dir = os.getcwd()
        portal_dir = os.path.join(current_dir, 'iceplant_portal')
        if os.path.exists(portal_dir):
            sys.path.append(portal_dir)
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iceplant_portal.settings')
            import django
            django.setup()
            logger.info("Django environment set up")
        else:
            logger.error(f"Could not find iceplant_portal directory in {current_dir}")
            return
            
        # Now import Django components
        from django.contrib.auth.models import Group
        from iceplant_core.group_permissions import HasModulePermission
        
        # Check if HR Payrol group exists
        hr_payrol = Group.objects.filter(name="HR Payrol").first()
        if hr_payrol:
            logger.info(f"Found HR Payrol group with ID: {hr_payrol.id}")
        else:
            logger.warning("HR Payrol group does not exist in the database")
            
        # Check module permissions in memory
        logger.info("Current MODULE_GROUP_MAPPING in HasModulePermission:")
        for module, groups in HasModulePermission.MODULE_GROUP_MAPPING.items():
            logger.info(f"  - {module}: {groups}")
            
        # Check which modules HR Payrol has access to in memory
        hr_payrol_modules = []
        for module, groups in HasModulePermission.MODULE_GROUP_MAPPING.items():
            if "HR Payrol" in groups:
                hr_payrol_modules.append(module)
        
        if hr_payrol_modules:
            logger.info(f"HR Payrol has access to modules in memory: {hr_payrol_modules}")
        else:
            logger.warning("HR Payrol not found in any modules in memory")
            
        # Check module_permissions.json files
        logger.info("\nChecking module_permissions.json files:")
        for file_path in [
            os.path.join(current_dir, "module_permissions.json"),
            os.path.join(portal_dir, "module_permissions.json"),
            os.path.join(portal_dir, "iceplant_core", "module_permissions.json")
        ]:
            if os.path.exists(file_path):
                logger.info(f"Found file at: {file_path}")
                try:
                    with open(file_path, 'r') as f:
                        permissions = json.load(f)
                        
                    # Check for HR Payrol
                    file_hr_payrol_modules = []
                    for module, groups in permissions.items():
                        if "HR Payrol" in groups:
                            file_hr_payrol_modules.append(module)
                            
                    if file_hr_payrol_modules:
                        logger.info(f"HR Payrol has access to modules in {file_path}: {file_hr_payrol_modules}")
                    else:
                        logger.warning(f"HR Payrol not found in any modules in {file_path}")
                except Exception as e:
                    logger.error(f"Error reading {file_path}: {e}")
            else:
                logger.info(f"File does not exist: {file_path}")
                
        # Test API function directly
        try:
            from rest_framework.test import APIRequestFactory
            from users.api_views_groups import update_group_module_permissions
            
            # Create a mock request
            factory = APIRequestFactory()
            data = {
                "group_name": "HR Payrol",
                "modules": {
                    "attendance": True,
                    "expenses": True,
                    "sales": False,
                    "inventory": False,
                    "maintenance": False,
                    "buyers": False
                }
            }
            request = factory.post('/api/users/update-group-modules/', data, format='json')
            
            # Set user as admin
            from django.contrib.auth.models import User
            admin_user = User.objects.filter(is_superuser=True).first()
            if admin_user:
                request.user = admin_user
                logger.info(f"Using admin user: {admin_user.username}")
            else:
                logger.warning("No admin user found")
                
            # Call the function
            logger.info("Calling update_group_module_permissions with test data")
            response = update_group_module_permissions(request)
            logger.info(f"Response status: {response.status_code}")
            logger.info(f"Response data: {response.data}")
            
            # Check if the changes are reflected
            logger.info("\nChecking MODULE_GROUP_MAPPING after API call:")
            for module, groups in HasModulePermission.MODULE_GROUP_MAPPING.items():
                logger.info(f"  - {module}: {groups}")
                
            # Now test loading the permissions file
            from iceplant_core.module_permissions_utils import load_module_permissions
            
            # Try to load each file
            for file_path in [
                os.path.join(current_dir, "module_permissions.json"),
                os.path.join(portal_dir, "module_permissions.json"),
                os.path.join(portal_dir, "iceplant_core", "module_permissions.json")
            ]:
                if os.path.exists(file_path):
                    logger.info(f"\nTrying to load permissions from {file_path}")
                    result = load_module_permissions(file_path)
                    logger.info(f"Load result: {result}")
                    
                    # Check if the changes are reflected
                    logger.info("MODULE_GROUP_MAPPING after loading:")
                    for module, groups in HasModulePermission.MODULE_GROUP_MAPPING.items():
                        logger.info(f"  - {module}: {groups}")
                    
            # Expected file path when not specifying in load_module_permissions
            default_path = os.path.abspath("module_permissions.json")
            logger.info(f"\nDefault module_permissions.json path would be: {default_path}")
            if os.path.exists(default_path):
                logger.info(f"This file exists")
            else:
                logger.info(f"This file does NOT exist")
            
            # Most critical test: try creating a copy of HasModulePermission to simulate server restart
            logger.info("\nSimulating server restart (re-importing HasModulePermission):")
            
            # Force reload by deleting from sys.modules
            if 'iceplant_core.group_permissions' in sys.modules:
                del sys.modules['iceplant_core.group_permissions']
                
            # Re-import
            from iceplant_core.group_permissions import HasModulePermission as ReloadedPermission
            
            # Check if HR Payrol is in the reloaded modules
            logger.info("MODULE_GROUP_MAPPING in reloaded HasModulePermission:")
            reloaded_hr_payrol_modules = []
            for module, groups in ReloadedPermission.MODULE_GROUP_MAPPING.items():
                logger.info(f"  - {module}: {groups}")
                if "HR Payrol" in groups:
                    reloaded_hr_payrol_modules.append(module)
            
            if reloaded_hr_payrol_modules:
                logger.info(f"HR Payrol has access to modules after reload: {reloaded_hr_payrol_modules}")
            else:
                logger.warning("HR Payrol NOT found in any modules after reload!")
                
        except Exception as e:
            logger.error(f"Error during API test: {e}")
    except Exception as e:
        logger.error(f"Error in main function: {e}")

if __name__ == "__main__":
    logger.info("===== Starting Django Module Permissions Diagnosis =====")
    main()
    logger.info("===== Diagnosis Complete =====")
