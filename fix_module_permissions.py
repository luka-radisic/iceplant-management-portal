"""
Fix script for module permissions persistence issue in the Iceplant Management Portal
"""
import os
import json
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("module_permissions_fix.log")
    ]
)
logger = logging.getLogger(__name__)

# Define base directory and possible locations for the module_permissions.json file
BASE_DIR = Path(__file__).resolve().parent
POSSIBLE_LOCATIONS = [
    BASE_DIR,
    BASE_DIR / "iceplant_portal",
    BASE_DIR / "iceplant_portal" / "iceplant_core",
    BASE_DIR / "iceplant_portal" / "iceplant_portal",
]

def find_module_permissions():
    """Find all module_permissions.json files in common locations"""
    found_files = []
    
    for location in POSSIBLE_LOCATIONS:
        file_path = location / "module_permissions.json"
        if file_path.exists():
            logger.info(f"Found module permissions file at: {file_path}")
            found_files.append(file_path)
        else:
            logger.info(f"No module permissions file at: {file_path}")
            
    return found_files

def ensure_directory_exists(directory):
    """Ensure the directory exists, create if it doesn't"""
    if not os.path.exists(directory):
        os.makedirs(directory)
        logger.info(f"Created directory: {directory}")
    return os.path.exists(directory)

def fix_module_permissions_file():
    """Fix the module permissions file"""
    # Get the current directory structure
    found_files = find_module_permissions()
    
    # Define default module-group mapping (from HasModulePermission class)
    DEFAULT_MODULE_MAPPING = {
        'attendance': ['HR', 'Managers', 'Admins'],
        'sales': ['Sales', 'Accounting', 'Managers', 'Admins'],
        'inventory': ['Inventory', 'Operations', 'Managers', 'Admins'],
        'expenses': ['Accounting', 'Finance', 'Managers', 'Admins'],
        'maintenance': ['Maintenance', 'Operations', 'Managers', 'Admins'],
        'buyers': ['Sales', 'Accounting', 'Managers', 'Admins'],
    }
    
    # Create files in all standard locations
    for location in POSSIBLE_LOCATIONS:
        if ensure_directory_exists(location):
            file_path = location / "module_permissions.json"
            
            try:
                if file_path.exists():
                    # Read existing file
                    with open(file_path, "r") as f:
                        content = json.load(f)
                        logger.info(f"Read existing file: {file_path}")
                        logger.info(f"Content: {json.dumps(content, indent=2)}")
                else:
                    # Create new file with default values
                    with open(file_path, "w") as f:
                        json.dump(DEFAULT_MODULE_MAPPING, f, indent=2)
                        logger.info(f"Created new file: {file_path}")
            except Exception as e:
                logger.error(f"Error handling file {file_path}: {e}")

def check_module_permissions_utils():
    """Check the module_permissions_utils.py file"""
    utils_path = BASE_DIR / "iceplant_portal" / "iceplant_core" / "module_permissions_utils.py"
    
    if not utils_path.exists():
        logger.error(f"Could not find module_permissions_utils.py at {utils_path}")
        return

    try:
        with open(utils_path, "r") as f:
            content = f.read()
            
        logger.info(f"Read module_permissions_utils.py from {utils_path}")
        
        # Check if save_module_permissions is using relative or absolute paths
        if "os.path.abspath" not in content and "os.path.join" not in content:
            logger.warning("save_module_permissions may not be using absolute paths!")
            
        # Check if there's proper error handling
        if "except Exception as e:" not in content:
            logger.warning("save_module_permissions may not have proper error handling!")
    except Exception as e:
        logger.error(f"Error reading module_permissions_utils.py: {e}")

def check_api_views_groups():
    """Check the api_views_groups.py file"""
    views_path = BASE_DIR / "iceplant_portal" / "users" / "api_views_groups.py"
    
    if not views_path.exists():
        logger.error(f"Could not find api_views_groups.py at {views_path}")
        return

    try:
        with open(views_path, "r") as f:
            content = f.read()
            
        logger.info(f"Read api_views_groups.py from {views_path}")
        
        # Check if update_group_module_permissions is calling save_module_permissions
        if "save_module_permissions()" in content:
            logger.info("Found call to save_module_permissions() in update_group_module_permissions")
        else:
            logger.warning("Could not find call to save_module_permissions() in update_group_module_permissions!")
            
        # Check for exception handling around save_module_permissions
        if "try:" in content and "from iceplant_core.module_permissions_utils import save_module_permissions" in content:
            logger.info("Found exception handling around save_module_permissions import")
        else:
            logger.warning("Could not find proper exception handling around save_module_permissions import!")
    except Exception as e:
        logger.error(f"Error reading api_views_groups.py: {e}")

def enhance_module_permissions_utils():
    """Create an enhanced version of module_permissions_utils.py"""
    # Define the enhanced content
    enhanced_content = """\"\"\"
Utility script to persist module permissions to a JSON file
\"\"\"
from iceplant_core.group_permissions import HasModulePermission
import json
import os
import logging

logger = logging.getLogger(__name__)

def save_module_permissions(filename='module_permissions.json'):
    \"\"\"Save the current module permissions to a JSON file\"\"\"
    module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
    
    # Use absolute path
    absolute_path = os.path.abspath(filename)
    logger.info(f"Saving module permissions to {absolute_path}")
    
    try:
        # Save to file
        with open(absolute_path, 'w') as f:
            json.dump(module_mapping, f, indent=2)
        
        logger.info(f"Module permissions saved to {absolute_path}")
        return True
    except Exception as e:
        logger.error(f"Error saving module permissions to {absolute_path}: {e}")
        return False

def load_module_permissions(filename='module_permissions.json'):
    \"\"\"Load module permissions from a JSON file\"\"\"
    # Use absolute path
    absolute_path = os.path.abspath(filename)
    logger.info(f"Loading module permissions from {absolute_path}")
    
    if not os.path.exists(absolute_path):
        logger.warning(f"File {absolute_path} does not exist")
        return False
    
    try:
        with open(absolute_path, 'r') as f:
            permissions = json.load(f)
            
        # Update module permissions
        HasModulePermission.MODULE_GROUP_MAPPING.update(permissions)
        logger.info(f"Module permissions loaded successfully from {absolute_path}")
        return True
    except json.JSONDecodeError:
        logger.error(f"File {absolute_path} is not valid JSON")
        return False
    except Exception as e:
        logger.error(f"Error loading module permissions from {absolute_path}: {e}")
        return False

def verify_permissions_loaded():
    \"\"\"Verify that module permissions were loaded correctly\"\"\"
    return HasModulePermission.MODULE_GROUP_MAPPING

if __name__ == "__main__":
    # By default, save the current permissions
    success = save_module_permissions()
    if success:
        print("Module permissions saved successfully")
    else:
        print("Failed to save module permissions")
"""
    
    # Path to the enhanced file
    enhanced_path = BASE_DIR / "enhanced_module_permissions_utils.py"
    
    try:
        with open(enhanced_path, "w") as f:
            f.write(enhanced_content)
            
        logger.info(f"Created enhanced module_permissions_utils.py at {enhanced_path}")
    except Exception as e:
        logger.error(f"Error creating enhanced module_permissions_utils.py: {e}")

def main():
    logger.info("===== Beginning Module Permissions Fix =====")
    
    # Find any existing module_permissions.json files
    find_module_permissions()
    
    # Fix/create module_permissions.json files in standard locations
    fix_module_permissions_file()
    
    # Check module_permissions_utils.py
    check_module_permissions_utils()
    
    # Check api_views_groups.py
    check_api_views_groups()
    
    # Create enhanced module_permissions_utils.py
    enhance_module_permissions_utils()
    
    logger.info("===== Fix Complete =====")
    logger.info("Please run 'python enhance_permissions.py' to apply the enhanced version")
    
if __name__ == "__main__":
    main()
