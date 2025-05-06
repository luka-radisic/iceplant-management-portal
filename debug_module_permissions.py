"""
A debug script to check module permissions and test saving functionality
"""
import os
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_module_permissions_file():
    """Check if module_permissions.json file exists and can be read"""
    file_path = 'module_permissions.json'
    logger.info(f"Checking for module permissions file: {file_path}")
    
    if os.path.exists(file_path):
        logger.info(f"File exists: {file_path}")
        try:
            with open(file_path, 'r') as f:
                permissions = json.load(f)
                logger.info(f"Successfully read permissions: {json.dumps(permissions, indent=2)}")
                return permissions
        except Exception as e:
            logger.error(f"Error reading file: {e}")
            return None
    else:
        logger.info(f"File does not exist: {file_path}")
        return None

def create_test_permissions():
    """Create a test permissions file"""
    file_path = 'module_permissions_test.json'
    test_permissions = {
        'attendance': ['HR', 'Managers', 'Admins', 'Test Group'],
        'sales': ['Sales', 'Accounting', 'Managers', 'Admins'],
        'inventory': ['Inventory', 'Operations', 'Managers', 'Admins', 'Test Group'],
        'expenses': ['Accounting', 'Finance', 'Managers', 'Admins'],
        'maintenance': ['Maintenance', 'Operations', 'Managers', 'Admins', 'Test Group'],
        'buyers': ['Sales', 'Accounting', 'Managers', 'Admins']
    }
    
    logger.info(f"Creating test permissions file: {file_path}")
    try:
        with open(file_path, 'w') as f:
            json.dump(test_permissions, f, indent=2)
            logger.info("Successfully created test permissions file")
        return True
    except Exception as e:
        logger.error(f"Error creating test file: {e}")
        return False

def test_import_permissions():
    """Test that the HasModulePermission class can import module permissions"""
    try:
        from iceplant_core.group_permissions import HasModulePermission
        logger.info("Current MODULE_GROUP_MAPPING:")
        for module, groups in HasModulePermission.MODULE_GROUP_MAPPING.items():
            logger.info(f"  - {module}: {groups}")
        
        # Check the current working directory
        logger.info(f"Current working directory: {os.getcwd()}")
        
        # Try to import module permissions
        from iceplant_core.module_permissions_utils import load_module_permissions
        result = load_module_permissions('module_permissions_test.json')
        logger.info(f"Load result: {result}")
        
        logger.info("Updated MODULE_GROUP_MAPPING after test import:")
        for module, groups in HasModulePermission.MODULE_GROUP_MAPPING.items():
            logger.info(f"  - {module}: {groups}")
            
        return result
    except Exception as e:
        logger.error(f"Error testing imports: {e}")
        return False

def test_export_permissions():
    """Test that the save_module_permissions function works"""
    try:
        from iceplant_core.module_permissions_utils import save_module_permissions
        result = save_module_permissions('module_permissions_export_test.json')
        logger.info(f"Export result: {result}")
        
        # Check if the file exists
        if os.path.exists('module_permissions_export_test.json'):
            logger.info("Export file successfully created")
            with open('module_permissions_export_test.json', 'r') as f:
                permissions = json.load(f)
                logger.info(f"Exported permissions: {json.dumps(permissions, indent=2)}")
            return True
        else:
            logger.warning("Export file was not created")
            return False
    except Exception as e:
        logger.error(f"Error testing exports: {e}")
        return False

if __name__ == "__main__":
    logger.info("===== Beginning Module Permissions Debug =====")
    
    # First, make sure we're in the right directory
    try:
        import django
        logger.info("Django is installed and importable")
        
        # Setup Django environment
        import os
        import sys
        
        # Get the current directory
        current_dir = os.getcwd()
        logger.info(f"Current directory: {current_dir}")
        
        # Add the iceplant_portal directory to the path if needed
        if os.path.basename(current_dir) != 'iceplant_portal':
            portal_dir = os.path.join(current_dir, 'iceplant_portal')
            if os.path.exists(portal_dir):
                sys.path.append(portal_dir)
                logger.info(f"Added {portal_dir} to path")
                os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iceplant_portal.settings')
                django.setup()
                logger.info("Django environment set up")
            else:
                logger.error(f"Could not find iceplant_portal directory in {current_dir}")
    except ImportError as e:
        logger.error(f"Django is not installed or not importable: {e}")
    
    # Check if module_permissions.json exists and can be read
    current_permissions = check_module_permissions_file()
    
    # Create a test permissions file
    create_test_permissions()
    
    # Test importing permissions
    import_result = test_import_permissions()
    logger.info(f"Import test result: {import_result}")
    
    # Test exporting permissions
    export_result = test_export_permissions()
    logger.info(f"Export test result: {export_result}")
    
    logger.info("===== Debug Complete =====")
