"""
Verification script to diagnose module permissions issue for HR Payrol group
"""
import os
import sys
import json
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("permission_diagnosis.log")
    ]
)
logger = logging.getLogger(__name__)

def check_environment():
    """Check the environment where the script is running"""
    try:
        # Print Python version
        logger.info(f"Python version: {sys.version}")
        
        # Get and print current working directory
        cwd = os.getcwd()
        logger.info(f"Current working directory: {cwd}")
        
        # Check if Django is available and configured
        try:
            import django
            logger.info(f"Django version: {django.get_version()}")
            
            # Setup Django environment
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iceplant_portal.settings')
            django.setup()
            logger.info("Django environment set up")
        except ImportError:
            logger.warning("Django not installed or not importable")
        
        return cwd
    except Exception as e:
        logger.error(f"Error checking environment: {e}")
        return None

def find_permission_files():
    """Find all module_permissions.json files"""
    possible_locations = [
        "",
        "iceplant_portal",
        os.path.join("iceplant_portal", "iceplant_core"),
        os.path.join("iceplant_portal", "iceplant_portal")
    ]
    
    found_files = []
    
    for loc in possible_locations:
        file_path = os.path.join(loc, "module_permissions.json")
        if os.path.exists(file_path):
            logger.info(f"Found module_permissions.json at: {file_path}")
            try:
                with open(file_path, 'r') as f:
                    permissions = json.load(f)
                logger.info(f"Content: {json.dumps(permissions, indent=2)}")
                
                # Check if HR Payrol is in any modules
                hr_payrol_modules = []
                for module, groups in permissions.items():
                    if "HR Payrol" in groups:
                        hr_payrol_modules.append(module)
                
                if hr_payrol_modules:
                    logger.info(f"HR Payrol has access to modules: {hr_payrol_modules}")
                else:
                    logger.warning(f"HR Payrol not found in any modules in {file_path}")
                
                found_files.append((file_path, permissions))
            except Exception as e:
                logger.error(f"Error reading {file_path}: {e}")
        else:
            logger.info(f"No module_permissions.json at: {file_path}")
    
    return found_files

def check_has_module_permission_class():
    """Check the HasModulePermission class configuration"""
    try:
        from iceplant_core.group_permissions import HasModulePermission
        
        # Log the current MODULE_GROUP_MAPPING
        logger.info("Current MODULE_GROUP_MAPPING in HasModulePermission:")
        for module, groups in HasModulePermission.MODULE_GROUP_MAPPING.items():
            logger.info(f"  - {module}: {groups}")
            
        # Check if HR Payrol is in any modules
        hr_payrol_modules = []
        for module, groups in HasModulePermission.MODULE_GROUP_MAPPING.items():
            if "HR Payrol" in groups:
                hr_payrol_modules.append(module)
        
        if hr_payrol_modules:
            logger.info(f"HR Payrol has access to modules in memory: {hr_payrol_modules}")
        else:
            logger.warning("HR Payrol not found in any modules in memory")
            
        return HasModulePermission.MODULE_GROUP_MAPPING
    except Exception as e:
        logger.error(f"Error checking HasModulePermission: {e}")
        return None

def test_save_permissions():
    """Test saving permissions with HR Payrol explicitly added"""
    try:
        from iceplant_core.group_permissions import HasModulePermission
        from iceplant_core.module_permissions_utils import save_module_permissions
        
        # Add HR Payrol to attendance and expenses explicitly
        logger.info("Adding HR Payrol to attendance and expenses modules")
        current_mapping = HasModulePermission.MODULE_GROUP_MAPPING
        
        # First make a copy to avoid modifying the original during iteration
        updated_mapping = {}
        for module, groups in current_mapping.items():
            updated_mapping[module] = groups.copy()
            
        # Now update the modules
        if "HR Payrol" not in updated_mapping['attendance']:
            updated_mapping['attendance'].append("HR Payrol")
            
        if "HR Payrol" not in updated_mapping['expenses']:
            updated_mapping['expenses'].append("HR Payrol")
        
        # Update the HasModulePermission.MODULE_GROUP_MAPPING
        HasModulePermission.MODULE_GROUP_MAPPING = updated_mapping
        
        # Print the updated mapping
        logger.info("Updated MODULE_GROUP_MAPPING:")
        for module, groups in HasModulePermission.MODULE_GROUP_MAPPING.items():
            logger.info(f"  - {module}: {groups}")
            
        # Save to all possible locations to ensure it's found
        for save_path in ["module_permissions.json", 
                           os.path.join("iceplant_portal", "module_permissions.json"),
                           os.path.join("iceplant_portal", "iceplant_core", "module_permissions.json")]:
            result = save_module_permissions(save_path)
            logger.info(f"Save to {save_path}: {'Success' if result else 'Failed'}")
            
        return True
    except Exception as e:
        logger.error(f"Error testing save permissions: {e}")
        return False

def test_api_directly():
    """Test the update_group_module_permissions function directly"""
    try:
        # Import Django modules
        from django.contrib.auth.models import Group
        from rest_framework.test import APIRequestFactory
        from iceplant_core.group_permissions import HasModulePermission
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
        
        # Create a user and add to request
        from django.contrib.auth.models import User
        user = User.objects.filter(is_superuser=True).first()
        if not user:
            logger.warning("No superuser found, creating one")
            user = User.objects.create_superuser('admin', 'admin@example.com', 'password')
        
        request.user = user
        
        # Call the function directly
        logger.info(f"Calling update_group_module_permissions directly with data: {data}")
        response = update_group_module_permissions(request)
        
        # Check the response
        logger.info(f"Response status code: {response.status_code}")
        logger.info(f"Response data: {response.data}")
        
        # Check if the changes are reflected in HasModulePermission
        logger.info("Checking MODULE_GROUP_MAPPING after direct API call:")
        for module, groups in HasModulePermission.MODULE_GROUP_MAPPING.items():
            logger.info(f"  - {module}: {groups}")
            
        return response.data
    except Exception as e:
        logger.error(f"Error testing API directly: {e}")
        return None

def main():
    logger.info("===== Starting Module Permissions Diagnosis =====")
    
    # Check environment
    cwd = check_environment()
    
    # Find all module_permissions.json files
    logger.info("\n===== Checking for module_permissions.json files =====")
    permission_files = find_permission_files()
    
    # Check HasModulePermission class
    logger.info("\n===== Checking HasModulePermission class =====")
    in_memory_permissions = check_has_module_permission_class()
    
    # Test saving permissions with HR Payrol explicitly added
    logger.info("\n===== Testing permission saves =====")
    save_result = test_save_permissions()
    
    # Test API directly
    logger.info("\n===== Testing API directly =====")
    api_result = test_api_directly()
    
    # Re-check HasModulePermission class after all tests
    logger.info("\n===== Re-checking HasModulePermission class after tests =====")
    updated_permissions = check_has_module_permission_class()
    
    # Re-check files after all tests
    logger.info("\n===== Re-checking module_permissions.json files after tests =====")
    updated_files = find_permission_files()
    
    logger.info("===== Diagnosis Complete =====")
    
if __name__ == "__main__":
    main()
