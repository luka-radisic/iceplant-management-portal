"""
This script performs simple tests on the module_permissions.json file
It can run without the Django environment for basic validation
"""
import os
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_permissions_file(file_path):
    """Check a specific permissions file"""
    logger.info(f"Checking file: {file_path}")
    
    if not os.path.exists(file_path):
        logger.warning(f"File does not exist: {file_path}")
        return None
    
    try:
        with open(file_path, 'r') as f:
            permissions = json.load(f)
            
        logger.info(f"Successfully read file with {len(permissions)} modules")
        
        # Check for HR Payrol
        hr_payrol_modules = []
        for module, groups in permissions.items():
            if "HR Payrol" in groups:
                hr_payrol_modules.append(module)
                
        if hr_payrol_modules:
            logger.info(f"HR Payrol has access to modules: {hr_payrol_modules}")
        else:
            logger.warning("HR Payrol not found in any modules")
            
        return permissions
    except Exception as e:
        logger.error(f"Error reading file: {e}")
        return None

def update_permissions_file(file_path):
    """Update a permissions file to include HR Payrol"""
    if not os.path.exists(file_path):
        logger.warning(f"File does not exist: {file_path}")
        return False
    
    try:
        with open(file_path, 'r') as f:
            permissions = json.load(f)
        
        # Add HR Payrol to attendance and expenses
        if 'attendance' in permissions and "HR Payrol" not in permissions['attendance']:
            permissions['attendance'].append("HR Payrol")
            logger.info("Added HR Payrol to attendance")
            
        if 'expenses' in permissions and "HR Payrol" not in permissions['expenses']:
            permissions['expenses'].append("HR Payrol")
            logger.info("Added HR Payrol to expenses")
        
        # Write back the updated permissions
        with open(file_path, 'w') as f:
            json.dump(permissions, f, indent=2)
            
        logger.info(f"Updated permissions in {file_path}")
        return True
    except Exception as e:
        logger.error(f"Error updating file: {e}")
        return False

def main():
    """Check and optionally update all permissions files"""
    current_dir = os.getcwd()
    logger.info(f"Current working directory: {current_dir}")
    
    # Check all potential files
    files_to_check = [
        os.path.join(current_dir, "module_permissions.json"),
        os.path.join(current_dir, "iceplant_portal", "module_permissions.json"),
        os.path.join(current_dir, "iceplant_portal", "iceplant_core", "module_permissions.json")
    ]
    
    results = {}
    
    for file_path in files_to_check:
        logger.info(f"\n--- Checking {file_path} ---")
        permissions = check_permissions_file(file_path)
        results[file_path] = permissions
    
    # Ask if user wants to update all files
    update = input("\nWould you like to update all permission files to include HR Payrol? (y/n): ").lower() == 'y'
    
    if update:
        logger.info("\n--- Updating permissions files ---")
        for file_path in files_to_check:
            if os.path.exists(file_path):
                update_permissions_file(file_path)

if __name__ == "__main__":
    logger.info("===== Starting Module Permissions Simple Check =====")
    main()
    logger.info("===== Check Complete =====")
