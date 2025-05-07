"""
Script to test the module permissions system integration

This script verifies:
1. Module permissions are correctly saved to disk
2. Django permissions are created for each module
3. Group permissions are properly synchronized between systems
4. Changes made through the API are reflected in both systems
"""
import os
import sys
import json
import logging
from datetime import datetime

# Set up logging
log_filename = f"module_permissions_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(log_filename)
    ]
)
logger = logging.getLogger(__name__)

def setup_django():
    """Set up Django environment"""
    try:
        # Add the iceplant_portal directory to the path
        current_dir = os.getcwd()
        portal_dir = os.path.join(current_dir, 'iceplant_portal')
        if os.path.exists(portal_dir):
            sys.path.append(portal_dir)
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iceplant_portal.settings')
            import django
            django.setup()
            logger.info(f"Django {django.get_version()} environment set up")
            return True
        else:
            logger.error(f"Could not find iceplant_portal directory in {current_dir}")
            return False
    except Exception as e:
        logger.error(f"Error setting up Django: {e}")
        return False

def test_initialization():
    """Test the initialization of the module permission system"""
    try:
        from iceplant_core.module_permissions_system import initialize_module_permission_system
        
        logger.info("Testing module permission system initialization...")
        result = initialize_module_permission_system()
        
        if result:
            logger.info("Successfully initialized module permission system")
        else:
            logger.warning("Initialization returned False, check for errors")
            
        return result
    except ImportError:
        logger.error("Could not import module_permissions_system module")
        return False
    except Exception as e:
        logger.error(f"Error during initialization: {e}")
        return False

def check_django_permissions():
    """Check if Django permissions were created for modules"""
    try:
        from django.contrib.auth.models import Permission
        from django.contrib.contenttypes.models import ContentType
        
        ct = ContentType.objects.filter(app_label='iceplant_core', model='modulepermission').first()
        if not ct:
            logger.error("No content type found for module permissions")
            return False
            
        module_perms = Permission.objects.filter(content_type=ct, codename__startswith='access_')
        
        logger.info(f"Found {module_perms.count()} module permissions in Django:")
        for perm in module_perms:
            module_name = perm.codename.replace('access_', '').replace('_module', '')
            logger.info(f"  - {perm.codename}: {perm.name} (module: {module_name})")
            
        return module_perms.count() > 0
    except Exception as e:
        logger.error(f"Error checking Django permissions: {e}")
        return False

def check_group_permissions():
    """Check module permissions for all groups"""
    try:
        from django.contrib.auth.models import Group, Permission
        from django.contrib.contenttypes.models import ContentType
        from iceplant_core.group_permissions import HasModulePermission
        
        groups = Group.objects.all()
        logger.info(f"Checking permissions for {groups.count()} groups")
        
        # Get module content type
        ct = ContentType.objects.filter(app_label='iceplant_core', model='modulepermission').first()
        if not ct:
            logger.error("No content type found for module permissions")
            return False
        
        # Check each group
        for group in groups:
            group_name = group.name
            logger.info(f"Group: {group_name}")
            
            # Check Django permissions
            django_perms = group.permissions.filter(content_type=ct)
            logger.info(f"  Django permissions: {django_perms.count()}")
            
            for perm in django_perms:
                module_name = perm.codename.replace('access_', '').replace('_module', '')
                logger.info(f"  - Has Django permission for module: {module_name}")
            
            # Check HasModulePermission
            module_access = []
            for module, groups in HasModulePermission.MODULE_GROUP_MAPPING.items():
                if group_name in groups:
                    module_access.append(module)
            
            logger.info(f"  HasModulePermission modules: {len(module_access)}")
            for module in module_access:
                logger.info(f"  - Has HasModulePermission for module: {module}")
                
            # Check if they match
            django_modules = [perm.codename.replace('access_', '').replace('_module', '') for perm in django_perms]
            if sorted(django_modules) == sorted(module_access):
                logger.info("  ✓ Django permissions match HasModulePermission modules")
            else:
                logger.warning("  ✗ Django permissions DO NOT match HasModulePermission modules")
                logger.warning(f"    Django modules: {sorted(django_modules)}")
                logger.warning(f"    HasModulePermission modules: {sorted(module_access)}")
        
        return True
    except Exception as e:
        logger.error(f"Error checking group permissions: {e}")
        return False

def test_update_group_module_access():
    """Test updating module access for a group"""
    try:
        from django.contrib.auth.models import Group
        from iceplant_core.module_permissions_system import update_group_module_access
        
        logger.info("Testing update_group_module_access...")
        
        # Try to update HR Payrol group
        hr_payrol = Group.objects.filter(name="HR Payrol").first()
        if not hr_payrol:
            logger.warning("HR Payrol group not found, trying another group")
            group = Group.objects.first()
            if not group:
                logger.error("No groups found in database")
                return False
            group_name = group.name
        else:
            group_name = "HR Payrol"
        
        logger.info(f"Updating module access for group: {group_name}")
        
        # Define test modules to update
        test_modules = {
            "attendance": True,
            "expenses": True,
            "sales": False,
            "inventory": False,
            "maintenance": False,
            "buyers": False,
        }
        
        # Update the group's module access
        result = update_group_module_access(group_name, test_modules)
        if result:
            logger.info(f"Successfully updated module access for {group_name}")
        else:
            logger.warning(f"Failed to update module access for {group_name}")
        
        # Check if changes were properly applied
        check_group_permissions()
        
        return result
    except Exception as e:
        logger.error(f"Error testing update_group_module_access: {e}")
        return False

def verify_permissions_files():
    """Verify that module permissions files exist and contain valid data"""
    try:
        from iceplant_core.module_permissions_system import STANDARD_LOCATIONS, get_absolute_paths
        
        logger.info("Verifying module permissions files...")
        
        absolute_paths = get_absolute_paths()
        
        for path in absolute_paths:
            if os.path.exists(path):
                try:
                    with open(path, 'r') as f:
                        permissions = json.load(f)
                    
                    logger.info(f"Found valid permissions file: {path}")
                    modules_count = len(permissions)
                    logger.info(f"  Contains {modules_count} modules")
                    
                    # Check a sample module
                    if 'attendance' in permissions:
                        logger.info(f"  'attendance' module has groups: {permissions['attendance']}")
                except json.JSONDecodeError:
                    logger.error(f"File {path} is not valid JSON")
                except Exception as e:
                    logger.error(f"Error reading {path}: {e}")
            else:
                logger.warning(f"File not found: {path}")
        
        return True
    except Exception as e:
        logger.error(f"Error verifying permissions files: {e}")
        return False

def test_api_endpoint():
    """Test the API endpoint for updating group module permissions"""
    try:
        from rest_framework.test import APIRequestFactory
        from django.contrib.auth.models import User, Group
        from users.api_views_groups import update_group_module_permissions
        
        logger.info("Testing API endpoint...")
        
        # Create a factory
        factory = APIRequestFactory()
        
        # Try to update HR Payrol group
        hr_payrol = Group.objects.filter(name="HR Payrol").first()
        if not hr_payrol:
            logger.warning("HR Payrol group not found, trying another group")
            group = Group.objects.first()
            if not group:
                logger.error("No groups found in database")
                return False
            group_name = group.name
        else:
            group_name = "HR Payrol"
            
        # Create test data
        data = {
            "group_name": group_name,
            "modules": {
                "attendance": True,
                "expenses": True,
                "sales": True,
                "inventory": False,
                "maintenance": False,
                "buyers": False,
            }
        }
        
        # Create a request
        request = factory.post('/api/users/update-group-modules/', data, format='json')
        
        # Add user authentication
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            logger.warning("No superuser found, API call will likely fail")
        else:
            request.user = admin_user
        
        # Call the API endpoint
        logger.info(f"Calling API endpoint with data: {data}")
        response = update_group_module_permissions(request)
        
        # Check the response
        logger.info(f"Response status code: {response.status_code}")
        logger.info(f"Response data: {response.data}")
        
        # Verify permissions
        check_group_permissions()
        
        return response.status_code == 200
    except Exception as e:
        logger.error(f"Error testing API endpoint: {e}")
        return False

def main():
    """Main test function"""
    logger.info("===== Module Permissions System Test =====")
    
    # Step 1: Set up Django
    if not setup_django():
        logger.error("Failed to set up Django environment. Tests cannot continue.")
        return
    
    # Step 2: Test initialization
    logger.info("\n=== Testing System Initialization ===")
    init_result = test_initialization()
    
    # Step 3: Check Django permissions
    logger.info("\n=== Checking Django Permissions ===")
    perm_result = check_django_permissions()
    
    # Step 4: Check group permissions
    logger.info("\n=== Checking Group Permissions ===")
    group_result = check_group_permissions()
    
    # Step 5: Verify permissions files
    logger.info("\n=== Verifying Permissions Files ===")
    file_result = verify_permissions_files()
    
    # Step 6: Test updating group module access
    logger.info("\n=== Testing Update Group Module Access ===")
    update_result = test_update_group_module_access()
    
    # Step 7: Test API endpoint
    logger.info("\n=== Testing API Endpoint ===")
    api_result = test_api_endpoint()
    
    # Summary
    logger.info("\n===== Test Summary =====")
    logger.info(f"Initialization: {'✓' if init_result else '✗'}")
    logger.info(f"Django Permissions: {'✓' if perm_result else '✗'}")
    logger.info(f"Group Permissions: {'✓' if group_result else '✗'}")
    logger.info(f"Permissions Files: {'✓' if file_result else '✗'}")
    logger.info(f"Update Group Module Access: {'✓' if update_result else '✗'}")
    logger.info(f"API Endpoint: {'✓' if api_result else '✗'}")
    
    overall = all([init_result, perm_result, group_result, file_result, update_result, api_result])
    logger.info(f"\nOverall Result: {'✓ PASS' if overall else '✗ FAIL'}")
    logger.info(f"Log saved to: {log_filename}")

if __name__ == "__main__":
    main()
