"""
This script implements a fix for the module permissions issue with the HR Payrol group.
It updates the HasModulePermission class to look for module_permissions.json in multiple locations
and enhances the save_module_permissions function to save to all standard locations.
"""
import os
import sys
import json
import shutil
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_environment():
    """Check the environment"""
    current_dir = os.getcwd()
    logger.info(f"Current working directory: {current_dir}")
    return current_dir

def update_has_module_permission_class(backup=True):
    """Update the HasModulePermission class to look in multiple locations"""
    file_path = os.path.join("iceplant_portal", "iceplant_core", "group_permissions.py")
    
    if not os.path.exists(file_path):
        logger.error(f"Could not find {file_path}")
        return False
    
    # Backup the file
    if backup:
        backup_path = f"{file_path}.bak"
        shutil.copy2(file_path, backup_path)
        logger.info(f"Backed up {file_path} to {backup_path}")
    
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Find the section that loads permissions
        if "# Try to load module permissions from disk on module import" in content:
            # Replace the import section with improved code
            start_marker = "# Try to load module permissions from disk on module import"
            end_marker = "except Exception as e:"
            
            start_pos = content.find(start_marker)
            if start_pos == -1:
                logger.error("Could not find start marker in file")
                return False
                
            # Find the end of the try block
            try_end_pos = content.find(end_marker, start_pos)
            if try_end_pos == -1:
                logger.error("Could not find end marker in file")
                return False
                
            # Get the indentation level
            lines = content[:start_pos].splitlines()
            if not lines:
                indentation = "    "
            else:
                indentation_match = lines[-1].strip() and len(lines[-1]) - len(lines[-1].lstrip()) or 4
                indentation = " " * indentation_match
                
            # Create the replacement code
            replacement = f"""{start_marker}
{indentation}try:
{indentation}    import os
{indentation}    import json
{indentation}    import logging
{indentation}    
{indentation}    logger = logging.getLogger(__name__)
{indentation}    
{indentation}    # Look for module_permissions.json in multiple standard locations
{indentation}    possible_locations = [
{indentation}        "module_permissions.json",  # Current directory
{indentation}        os.path.join("iceplant_portal", "module_permissions.json"),
{indentation}        os.path.join("iceplant_portal", "iceplant_core", "module_permissions.json"),
{indentation}    ]
{indentation}    
{indentation}    # Try each location until we find a valid file
{indentation}    loaded = False
{indentation}    for permission_file in possible_locations:
{indentation}        if os.path.exists(permission_file):
{indentation}            try:
{indentation}                with open(permission_file, 'r') as f:
{indentation}                    saved_permissions = json.load(f)
{indentation}                
{indentation}                # Update the mapping with saved permissions
{indentation}                MODULE_GROUP_MAPPING.update(saved_permissions)
{indentation}                logger.info(f"Loaded module permissions from {{permission_file}}")
{indentation}                loaded = True
{indentation}                break  # Stop after finding the first valid file
{indentation}            except Exception as e:
{indentation}                logger.error(f"Error loading module permissions from {{permission_file}}: {{e}}")
{indentation}    
{indentation}    if not loaded:
{indentation}        logger.warning("No valid module_permissions.json found in any standard location")
{indentation}{end_marker}"""
            
            # Replace the section
            new_content = content[:start_pos] + replacement + content[try_end_pos:]
            
            # Write the updated file
            with open(file_path, 'w') as f:
                f.write(new_content)
                
            logger.info(f"Updated {file_path} with improved permission loading")
            return True
        else:
            logger.error("Could not find permission loading section in file")
            return False
            
    except Exception as e:
        logger.error(f"Error updating HasModulePermission: {e}")
        return False

def update_module_permissions_utils(backup=True):
    """Update the module_permissions_utils.py file to save to all locations"""
    file_path = os.path.join("iceplant_portal", "iceplant_core", "module_permissions_utils.py")
    
    if not os.path.exists(file_path):
        logger.error(f"Could not find {file_path}")
        return False
    
    # Backup the file
    if backup:
        backup_path = f"{file_path}.bak"
        shutil.copy2(file_path, backup_path)
        logger.info(f"Backed up {file_path} to {backup_path}")
    
    # New content with improved save_module_permissions function
    new_content = """\"\"\"
Utility script to persist module permissions to a JSON file
\"\"\"
from iceplant_core.group_permissions import HasModulePermission
import json
import os
import logging

logger = logging.getLogger(__name__)

def save_module_permissions(filename='module_permissions.json'):
    \"\"\"Save the current module permissions to all standard JSON file locations\"\"\"
    module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
    
    # Define standard locations
    standard_locations = [
        "module_permissions.json",  # Current directory
        os.path.join("iceplant_portal", "module_permissions.json"),
        os.path.join("iceplant_portal", "iceplant_core", "module_permissions.json"),
    ]
    
    success = True
    for location in standard_locations:
        try:
            # Use absolute path
            absolute_path = os.path.abspath(location)
            logger.info(f"Saving module permissions to {absolute_path}")
            
            # Ensure directory exists
            directory = os.path.dirname(absolute_path)
            if directory and not os.path.exists(directory):
                os.makedirs(directory, exist_ok=True)
            
            # Save to file
            with open(absolute_path, 'w') as f:
                json.dump(module_mapping, f, indent=2)
            
            logger.info(f"Module permissions saved to {absolute_path}")
        except Exception as e:
            logger.error(f"Error saving module permissions to {location}: {e}")
            success = False
    
    return success

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

def reload_module_permissions():
    \"\"\"Reload module permissions from all standard locations\"\"\"
    # Define standard locations
    standard_locations = [
        "module_permissions.json",  # Current directory
        os.path.join("iceplant_portal", "module_permissions.json"),
        os.path.join("iceplant_portal", "iceplant_core", "module_permissions.json"),
    ]
    
    # Try each location until we find a valid file
    for location in standard_locations:
        if os.path.exists(location):
            try:
                result = load_module_permissions(location)
                if result:
                    logger.info(f"Successfully reloaded permissions from {location}")
                    return True
            except Exception as e:
                logger.error(f"Error reloading from {location}: {e}")
    
    logger.warning("Could not reload permissions from any location")
    return False

def verify_permissions_loaded():
    \"\"\"Verify that module permissions were loaded correctly\"\"\"
    return HasModulePermission.MODULE_GROUP_MAPPING

if __name__ == "__main__":
    # By default, save the current permissions to all locations
    success = save_module_permissions()
    if success:
        print("Module permissions saved successfully to all locations")
    else:
        print("There were errors saving module permissions. Check the logs.")
"""
    
    try:
        # Write the new content
        with open(file_path, 'w') as f:
            f.write(new_content)
            
        logger.info(f"Updated {file_path} with improved module permissions utils")
        return True
    except Exception as e:
        logger.error(f"Error updating module permissions utils: {e}")
        return False

def create_management_command():
    """Create a Django management command to reload permissions"""
    # Create management/commands directories if they don't exist
    management_dir = os.path.join("iceplant_portal", "iceplant_core", "management")
    commands_dir = os.path.join(management_dir, "commands")
    
    os.makedirs(management_dir, exist_ok=True)
    os.makedirs(commands_dir, exist_ok=True)
    
    # Create __init__.py files
    with open(os.path.join(management_dir, "__init__.py"), 'w') as f:
        f.write("")
    
    with open(os.path.join(commands_dir, "__init__.py"), 'w') as f:
        f.write("")
    
    # Create reload_permissions.py command
    command_path = os.path.join(commands_dir, "reload_permissions.py")
    
    command_content = """\"\"\"
Django management command to reload module permissions
\"\"\"
from django.core.management.base import BaseCommand
from iceplant_core.module_permissions_utils import reload_module_permissions
from iceplant_core.group_permissions import HasModulePermission
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Reload module permissions from JSON files'
    
    def handle(self, *args, **options):
        self.stdout.write('Reloading module permissions...')
        
        # Print current permissions
        self.stdout.write('Current permissions:')
        for module, groups in HasModulePermission.MODULE_GROUP_MAPPING.items():
            self.stdout.write(f'  - {module}: {groups}')
        
        # Reload permissions
        result = reload_module_permissions()
        
        if result:
            self.stdout.write(self.style.SUCCESS('Successfully reloaded module permissions'))
        else:
            self.stdout.write(self.style.ERROR('Failed to reload module permissions'))
        
        # Print updated permissions
        self.stdout.write('Updated permissions:')
        for module, groups in HasModulePermission.MODULE_GROUP_MAPPING.items():
            self.stdout.write(f'  - {module}: {groups}')
"""
    
    try:
        with open(command_path, 'w') as f:
            f.write(command_content)
            
        logger.info(f"Created management command at {command_path}")
        return True
    except Exception as e:
        logger.error(f"Error creating management command: {e}")
        return False

def main():
    """Apply all fixes"""
    logger.info("Starting module permissions fix...")
    
    # Check environment
    check_environment()
    
    # Update HasModulePermission class
    update_has_module_permission_class()
    
    # Update module_permissions_utils.py
    update_module_permissions_utils()
    
    # Create management command
    create_management_command()
    
    logger.info("""
Module permissions fix complete! Here's what was done:

1. Updated HasModulePermission class to look for permissions in multiple locations
2. Enhanced module_permissions_utils.py to save to all standard locations
3. Added a reload_permissions management command

To reload permissions without restarting Django, run:
python manage.py reload_permissions

After these changes, module permissions should be properly persisted and loaded,
even after server restarts.
""")

if __name__ == "__main__":
    logger.info("===== Module Permissions Fix =====")
    main()
    logger.info("===== Fix Complete =====")
