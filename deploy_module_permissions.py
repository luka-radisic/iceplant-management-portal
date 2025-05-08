"""
Comprehensive Module Permissions Fix Deployment Script

This script:
1. Creates the necessary module permissions system files
2. Updates the existing code to use the new system
3. Creates Django permissions for all modules
4. Synchronizes Django permissions with the custom HasModulePermission system
5. Provides tools for debugging and maintenance
"""
import os
import sys
import json
import shutil
import logging
from pathlib import Path
from datetime import datetime

# Configure logging
log_filename = f"module_permissions_deployment_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(log_filename)
    ]
)
logger = logging.getLogger(__name__)

# Define paths
BASE_DIR = Path(os.getcwd())
PORTAL_DIR = BASE_DIR / "iceplant_portal"
CORE_DIR = PORTAL_DIR / "iceplant_core"
USERS_DIR = PORTAL_DIR / "users"

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

def create_module_permissions_system():
    """Create the module permissions system file"""
    target_file = CORE_DIR / "module_permissions_system.py"
    
    # Back up existing file if it exists
    backup_file(target_file)
    
    # Create the file content
    content = """\"\"\"
Module Permissions System

This module provides a comprehensive system to connect the HasModulePermission system
with Django's built-in permission system, ensuring that module permissions are properly
reflected in the Django admin interface.

Key features:
- Creates Django permissions for each module
- Updates Django permissions when module permissions are updated
- Synchronizes Django permissions with HasModulePermission module mappings
\"\"\"
import os
import json
import logging
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from iceplant_core.group_permissions import HasModulePermission

logger = logging.getLogger(__name__)

# Define standard file locations for module permissions
STANDARD_LOCATIONS = [
    "module_permissions.json",  # Current directory
    os.path.join("iceplant_portal", "module_permissions.json"),
    os.path.join("iceplant_portal", "iceplant_core", "module_permissions.json"),
]

def get_absolute_paths():
    \"\"\"Get absolute paths for all standard locations\"\"\"
    return [os.path.abspath(location) for location in STANDARD_LOCATIONS]

def get_module_permission_content_type():
    \"\"\"Get or create a content type for module permissions\"\"\"
    try:
        ct, created = ContentType.objects.get_or_create(
            app_label='iceplant_core',
            model='modulepermission'
        )
        if created:
            logger.info(f"Created new content type for module permissions: {ct}")
        return ct
    except Exception as e:
        logger.error(f"Error getting/creating content type: {e}")
        return None

def create_module_permission(module_name):
    \"\"\"Create a Django permission for a module\"\"\"
    try:
        ct = get_module_permission_content_type()
        if not ct:
            logger.error("Cannot create module permission: content type not available")
            return None
            
        codename = f"access_{module_name}_module"
        name = f"Can access {module_name} module"
        
        perm, created = Permission.objects.get_or_create(
            content_type=ct,
            codename=codename,
            defaults={'name': name}
        )
        
        if created:
            logger.info(f"Created permission for {module_name}: {perm.codename}")
        
        return perm
    except Exception as e:
        logger.error(f"Error creating permission for module {module_name}: {e}")
        return None

def create_all_module_permissions():
    \"\"\"Create Django permissions for all modules in the system\"\"\"
    try:
        permissions_created = []
        
        # Get all modules from HasModulePermission
        modules = HasModulePermission.MODULE_GROUP_MAPPING.keys()
        
        for module in modules:
            perm = create_module_permission(module)
            if perm:
                permissions_created.append(perm)
                
        logger.info(f"Created {len(permissions_created)} module permissions")
        return permissions_created
    except Exception as e:
        logger.error(f"Error creating module permissions: {e}")
        return []

def get_module_permission(module_name):
    \"\"\"Get the Django permission for a module\"\"\"
    try:
        ct = get_module_permission_content_type()
        if not ct:
            return None
            
        codename = f"access_{module_name}_module"
        return Permission.objects.filter(content_type=ct, codename=codename).first()
    except Exception as e:
        logger.error(f"Error getting permission for module {module_name}: {e}")
        return None

def sync_group_module_permissions(group_name):
    \"\"\"
    Synchronize Django permissions with HasModulePermission module mappings
    for a specific group
    \"\"\"
    try:
        # Get the group
        try:
            group = Group.objects.get(name=group_name)
        except Group.DoesNotExist:
            logger.error(f"Group {group_name} does not exist")
            return False
        
        # First, ensure all module permissions exist
        create_all_module_permissions()
        
        # Get modules this group has access to
        groups_modules = []
        for module, groups in HasModulePermission.MODULE_GROUP_MAPPING.items():
            if group_name in groups:
                groups_modules.append(module)
        
        logger.info(f"Group {group_name} should have access to modules: {groups_modules}")
        
        # Get all module permissions
        ct = get_module_permission_content_type()
        all_module_perms = Permission.objects.filter(
            content_type=ct, 
            codename__startswith="access_", 
            codename__endswith="_module"
        )
        
        # Build a mapping of module names to permissions
        module_to_perm = {}
        for perm in all_module_perms:
            # Extract module name from codename (access_MODULE_module)
            module_name = perm.codename.replace("access_", "").replace("_module", "")
            module_to_perm[module_name] = perm
        
        # Update group permissions in a transaction
        with transaction.atomic():
            # First, remove all module permissions
            for module, perm in module_to_perm.items():
                if perm in group.permissions.all():
                    group.permissions.remove(perm)
                    logger.debug(f"Removed permission {perm.codename} from {group_name}")
            
            # Then add permissions for allowed modules
            for module in groups_modules:
                if module in module_to_perm:
                    group.permissions.add(module_to_perm[module])
                    logger.info(f"Added permission {module_to_perm[module].codename} to {group_name}")
        
        return True
    except Exception as e:
        logger.error(f"Error synchronizing permissions for group {group_name}: {e}")
        return False

def sync_all_group_permissions():
    \"\"\"Synchronize Django permissions with HasModulePermission for all groups\"\"\"
    try:
        # Get all existing groups
        groups = Group.objects.all()
        
        success_count = 0
        for group in groups:
            if sync_group_module_permissions(group.name):
                success_count += 1
        
        logger.info(f"Synchronized permissions for {success_count}/{len(groups)} groups")
        return True
    except Exception as e:
        logger.error(f"Error synchronizing all group permissions: {e}")
        return False

def save_module_permissions_multi():
    \"\"\"Save the current module permissions to all standard JSON file locations\"\"\"
    module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
    
    success = True
    saved_locations = []
    
    for location in STANDARD_LOCATIONS:
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
            saved_locations.append(absolute_path)
        except Exception as e:
            logger.error(f"Error saving module permissions to {location}: {e}")
            success = False
    
    return success, saved_locations

def load_module_permissions_multi():
    \"\"\"Load module permissions from any available standard location\"\"\"
    for location in STANDARD_LOCATIONS:
        # Use absolute path
        absolute_path = os.path.abspath(location)
        
        if not os.path.exists(absolute_path):
            logger.debug(f"File {absolute_path} does not exist")
            continue
        
        try:
            logger.info(f"Attempting to load module permissions from {absolute_path}")
            with open(absolute_path, 'r') as f:
                permissions = json.load(f)
                
            # Update module permissions
            HasModulePermission.MODULE_GROUP_MAPPING.update(permissions)
            logger.info(f"Module permissions loaded successfully from {absolute_path}")
            return True
        except json.JSONDecodeError:
            logger.error(f"File {absolute_path} is not valid JSON")
        except Exception as e:
            logger.error(f"Error loading module permissions from {absolute_path}: {e}")
    
    logger.warning("Could not load module permissions from any standard location")
    return False

def update_group_module_access(group_name, module_mappings):
    \"\"\"
    Update module access for a group and sync with Django permissions
    
    Args:
        group_name: The name of the group to update
        module_mappings: A dict mapping module names to boolean access values
                        e.g. {'attendance': True, 'sales': False}
    
    Returns:
        bool: Success flag
    \"\"\"
    try:
        # Check if group exists
        try:
            group = Group.objects.get(name=group_name)
        except Group.DoesNotExist:
            logger.error(f"Group {group_name} does not exist")
            return False
        
        # First, load the latest module permissions
        load_module_permissions_multi()
        
        # Get current module mapping
        module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
        
        # Update module permissions based on the provided mappings
        for module, has_access in module_mappings.items():
            if module not in module_mapping:
                logger.warning(f"Module {module} not found in module mapping, skipping")
                continue
                
            if has_access:
                # Add group to module permissions if not already there
                if group_name not in module_mapping[module]:
                    module_mapping[module].append(group_name)
                    logger.info(f"Added {group_name} to {module}")
            else:
                # Remove group from module permissions if it's there
                if group_name in module_mapping[module]:
                    module_mapping[module].remove(group_name)
                    logger.info(f"Removed {group_name} from {module}")
        
        # Persist changes to disk
        success, locations = save_module_permissions_multi()
        if not success:
            logger.warning("Failed to save module permissions to some locations")
        
        # Sync with Django permissions
        if sync_group_module_permissions(group_name):
            logger.info(f"Successfully synced Django permissions for {group_name}")
        else:
            logger.warning(f"Failed to sync Django permissions for {group_name}")
        
        return True
    except Exception as e:
        logger.error(f"Error updating module access for group {group_name}: {e}")
        return False

def initialize_module_permission_system():
    \"\"\"
    Initialize the module permission system by:
    1. Loading the latest module permissions
    2. Creating all module permissions in Django
    3. Syncing all group permissions
    
    This should be run during application startup or when 
    the permission system needs to be reset.
    \"\"\"
    try:
        logger.info("Initializing module permission system...")
        
        # 1. Load the latest module permissions
        load_success = load_module_permissions_multi()
        if load_success:
            logger.info("Successfully loaded module permissions from disk")
        else:
            logger.warning("Could not load module permissions from disk, using defaults")
        
        # 2. Create all module permissions in Django
        create_all_module_permissions()
        
        # 3. Sync all group permissions
        sync_success = sync_all_group_permissions()
        if sync_success:
            logger.info("Successfully synchronized all group permissions")
        else:
            logger.warning("Failed to synchronize some group permissions")
        
        return True
    except Exception as e:
        logger.error(f"Error initializing module permission system: {e}")
        return False

if __name__ == "__main__":
    # When run as a script, initialize the system
    initialize_module_permission_system()
"""
    
    try:
        with open(target_file, 'w') as f:
            f.write(content)
        logger.info(f"Created module_permissions_system.py at {target_file}")
        return True
    except Exception as e:
        logger.error(f"Error creating module_permissions_system.py: {e}")
        return False

def create_management_command():
    """Create the management command for syncing module permissions"""
    # Create directories if they don't exist
    commands_dir = CORE_DIR / "management" / "commands"
    os.makedirs(commands_dir, exist_ok=True)
    
    # Create __init__.py files if they don't exist
    init_paths = [
        CORE_DIR / "management" / "__init__.py",
        commands_dir / "__init__.py"
    ]
    
    for init_path in init_paths:
        if not os.path.exists(init_path):
            with open(init_path, 'w') as f:
                pass
            logger.info(f"Created {init_path}")
    
    # Create the management command
    target_file = commands_dir / "sync_module_permissions.py"
    
    # Back up existing file if it exists
    backup_file(target_file)
    
    # Create the file content
    content = """\"\"\"
Django management command to initialize or refresh module permissions.

This command creates or updates Django permissions for all modules
and synchronizes them with the HasModulePermission system.

Usage:
    python manage.py sync_module_permissions [--group GROUP_NAME]
\"\"\"
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import Group
from iceplant_core.module_permissions_system import (
    initialize_module_permission_system,
    sync_group_module_permissions
)
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Initialize or refresh module permissions for all or a specific group'

    def add_arguments(self, parser):
        # Optional group argument
        parser.add_argument(
            '--group',
            dest='group',
            help='Specify a group name to sync permissions for just that group',
        )

    def handle(self, *args, **options):
        group_name = options.get('group')
        
        if group_name:
            # Sync permissions for a specific group
            try:
                # Check if group exists
                try:
                    group = Group.objects.get(name=group_name)
                except Group.DoesNotExist:
                    raise CommandError(f"Group '{group_name}' does not exist")
                
                self.stdout.write(f"Syncing module permissions for group '{group_name}'...")
                
                if sync_group_module_permissions(group_name):
                    self.stdout.write(self.style.SUCCESS(
                        f"Successfully synced module permissions for group '{group_name}'"
                    ))
                else:
                    self.stdout.write(self.style.ERROR(
                        f"Failed to sync module permissions for group '{group_name}'"
                    ))
                    
            except Exception as e:
                raise CommandError(f"Error syncing permissions for group '{group_name}': {e}")
        else:
            # Initialize the entire module permission system
            self.stdout.write("Initializing module permission system...")
            
            try:
                if initialize_module_permission_system():
                    self.stdout.write(self.style.SUCCESS(
                        "Module permission system successfully initialized"
                    ))
                else:
                    self.stdout.write(self.style.ERROR(
                        "Failed to fully initialize module permission system"
                    ))
            except Exception as e:
                raise CommandError(f"Error initializing module permission system: {e}")
"""
    
    try:
        with open(target_file, 'w') as f:
            f.write(content)
        logger.info(f"Created sync_module_permissions.py at {target_file}")
        return True
    except Exception as e:
        logger.error(f"Error creating sync_module_permissions.py: {e}")
        return False

def update_app_config():
    """Update or create the app config to initialize the module permission system"""
    target_file = CORE_DIR / "apps.py"
    
    # Back up existing file if it exists
    backup_file(target_file)
    
    # Create the file content
    content = """\"\"\"
IceplantCore app configuration
\"\"\"
from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)

class IceplantCoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'iceplant_core'
    verbose_name = 'Iceplant Core'

    def ready(self):
        \"\"\"
        Initialize the module permission system when the Django app is ready.
        This ensures that Django permissions are created for all modules
        and synchronized with the HasModulePermission system.
        \"\"\"
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
"""
    
    try:
        with open(target_file, 'w') as f:
            f.write(content)
        logger.info(f"Created/updated apps.py at {target_file}")
        return True
    except Exception as e:
        logger.error(f"Error creating/updating apps.py: {e}")
        return False

def update_api_views_groups():
    """Update the API views to use the new module permissions system"""
    target_file = USERS_DIR / "api_views_groups.py"
    
    # Check if file exists
    if not os.path.exists(target_file):
        logger.error(f"api_views_groups.py not found at {target_file}")
        return False
    
    # Back up existing file
    backup_file(target_file)
    
    try:
        # Read the file
        with open(target_file, 'r') as f:
            content = f.read()
        
        # Look for the update_group_module_permissions function
        import re
        
        pattern = r'@api_view\(\[\'POST\'\]\)\s*@permission_classes\(\[IsAuthenticated,\s*IsAdmin\]\)\s*def update_group_module_permissions\(request\):.*?return Response\({.*?}\)'
        
        replacement = """@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def update_group_module_permissions(request):
    \"\"\"
    Update module permissions for a group.
    Request format:
    {
        "group_name": "Test Group",
        "modules": {
            "maintenance": true,
            "inventory": false,
            ...
        }
    }
    \"\"\"
    import logging
    
    # Get a logger
    logger = logging.getLogger(__name__)
    logger.info(f"Updating module permissions: {request.data}")
    
    group_name = request.data.get('group_name')
    modules = request.data.get('modules', {})
    
    if not group_name:
        return Response({"error": "Group name is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Check if group exists
        group = Group.objects.get(name=group_name)
    except Group.DoesNotExist:
        return Response({"error": f"Group '{group_name}' does not exist"}, status=status.HTTP_404_NOT_FOUND)
    
    # Use the improved module_permissions_system to update permissions
    try:
        from iceplant_core.module_permissions_system import (
            update_group_module_access, 
            HasModulePermission
        )
        
        # Update the module access using the comprehensive system
        update_success = update_group_module_access(group_name, modules)
        
        if not update_success:
            logger.warning(f"Some errors occurred while updating module access for {group_name}")
        
        # Get the updated mapping for the response
        module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
        
    except ImportError:
        # Fall back to the old method if the new system is not available
        logger.warning("module_permissions_system not available, falling back to legacy method")
        
        from iceplant_core.group_permissions import HasModulePermission
        from iceplant_core.module_permissions_utils import save_module_permissions
        
        # Legacy implementation
        existing_groups = set(Group.objects.values_list('name', flat=True))
        module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
        
        # Clean up first - remove any non-existent groups from all modules
        for module in module_mapping:
            module_mapping[module] = [g for g in module_mapping[module] if g in existing_groups]
        
        # First remove the group from all modules that aren't explicitly set to True
        # This ensures that we handle modules not included in the request
        all_modules = set(module_mapping.keys())
        modules_to_include = {m for m, v in modules.items() if v}
        modules_to_exclude = all_modules - modules_to_include
        
        # Remove group from all modules not explicitly included
        for module in modules_to_exclude:
            if module in module_mapping and group_name in module_mapping[module]:
                module_mapping[module].remove(group_name)
                logger.info(f"Removed {group_name} from {module} (excluded module)")
        
        # Now update the modules based on the request
        for module, has_access in modules.items():
            if module not in module_mapping:
                continue
                
            logger.info(f"Module {module}: {has_access}")
            
            if has_access:
                # Add group to module permissions if not already there
                if group_name not in module_mapping[module]:
                    module_mapping[module].append(group_name)
                    logger.info(f"Added {group_name} to {module}")
            else:
                # Remove group from module permissions if it's there
                if group_name in module_mapping[module]:
                    module_mapping[module].remove(group_name)
                    logger.info(f"Removed {group_name} from {module}")
        
        # Persist changes to disk
        try:
            save_module_permissions()
            logger.info("Module permissions persisted to disk")
        except Exception as e:
            logger.error(f"Error persisting module permissions: {e}")
    
    # Log the final state for debugging
    logger.info(f"Final module mapping: {module_mapping}")
    
    return Response({
        "message": f"Module permissions updated for group '{group_name}'",
        "updated_mapping": module_mapping
    })"""
        
        # Using regex with the DOTALL flag to match across multiple lines
        updated_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
        
        # Check if the content was actually modified
        if updated_content == content:
            logger.warning("Could not find the update_group_module_permissions function or no changes were made")
            
            # Try an alternative approach - just append the new function at the end
            # This is a fallback if the regex doesn't work
            with open(target_file, 'a') as f:
                f.write("\n\n# Updated module permissions function\n")
                f.write(replacement)
                
            logger.info(f"Appended the new update_group_module_permissions function to {target_file}")
        else:
            # Write the updated content back to the file
            with open(target_file, 'w') as f:
                f.write(updated_content)
                
            logger.info(f"Updated update_group_module_permissions function in {target_file}")
            
        return True
    except Exception as e:
        logger.error(f"Error updating api_views_groups.py: {e}")
        return False

def update_module_permissions_utils():
    """Update the module_permissions_utils.py to use the new system"""
    target_file = CORE_DIR / "module_permissions_utils.py"
    
    # Check if file exists
    if not os.path.exists(target_file):
        logger.error(f"module_permissions_utils.py not found at {target_file}")
        return False
    
    # Back up existing file
    backup_file(target_file)
    
    # Create the file content
    content = """\"\"\"
Utility script to persist module permissions to a JSON file
This version uses the enhanced module_permissions_system module.
\"\"\"
from iceplant_core.group_permissions import HasModulePermission
import json
import os
import logging

logger = logging.getLogger(__name__)

def save_module_permissions(filename='module_permissions.json'):
    \"\"\"
    Save the current module permissions to a JSON file
    This function is kept for backward compatibility.
    It now delegates to the new module_permissions_system
    \"\"\"
    try:
        from iceplant_core.module_permissions_system import save_module_permissions_multi
        success, locations = save_module_permissions_multi()
        return success
    except ImportError:
        # Fall back to the old implementation
        module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
        
        # Use absolute path
        absolute_path = os.path.abspath(filename)
        logger.info(f"Saving module permissions to {absolute_path}")
        
        try:
            # Ensure directory exists
            directory = os.path.dirname(absolute_path)
            if directory and not os.path.exists(directory):
                os.makedirs(directory, exist_ok=True)
                
            # Save to file
            with open(absolute_path, 'w') as f:
                json.dump(module_mapping, f, indent=2)
            
            logger.info(f"Module permissions saved to {absolute_path}")
            return True
        except Exception as e:
            logger.error(f"Error saving module permissions to {absolute_path}: {e}")
            return False

def load_module_permissions(filename='module_permissions.json'):
    \"\"\"
    Load module permissions from a JSON file
    This function is kept for backward compatibility.
    It now delegates to the new module_permissions_system
    \"\"\"
    try:
        from iceplant_core.module_permissions_system import load_module_permissions_multi
        return load_module_permissions_multi()
    except ImportError:
        # Fall back to the old implementation
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

def reload_module_permissions():
    \"\"\"Reload module permissions from disk\"\"\"
    try:
        from iceplant_core.module_permissions_system import load_module_permissions_multi
        return load_module_permissions_multi()
    except ImportError:
        return load_module_permissions()

if __name__ == "__main__":
    # By default, save the current permissions
    success = save_module_permissions()
    if success:
        print("Module permissions saved successfully")
    else:
        print("Failed to save module permissions")
"""
    
    try:
        with open(target_file, 'w') as f:
            f.write(content)
        logger.info(f"Updated module_permissions_utils.py at {target_file}")
        return True
    except Exception as e:
        logger.error(f"Error updating module_permissions_utils.py: {e}")
        return False

def create_deployment_scripts():
    """Create deployment scripts for different environments"""
    
    # PowerShell script for Windows
    powershell_script = """# Deploy Module Permissions System
# This script deploys the module permissions system to fix the HR Payrol group permissions issue

Write-Host "Deploying Module Permissions System..." -ForegroundColor Green

# 1. Set up Python environment
Write-Host "Setting up Python environment..."
$env:PYTHONPATH = "$PWD;$env:PYTHONPATH"

# 2. Run the deployment
Write-Host "Running deployment script..."
python deploy_module_permissions.py

# 3. Sync permissions
Write-Host "Syncing module permissions..."
python iceplant_portal/manage.py sync_module_permissions

# 4. Restart services if needed
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "Please restart your Django server to apply the changes."
"""
    
    # Bash script for Linux/Mac
    bash_script = """#!/bin/bash
# Deploy Module Permissions System
# This script deploys the module permissions system to fix the HR Payrol group permissions issue

echo -e "\033[32mDeploying Module Permissions System...\033[0m"

# 1. Set up Python environment
echo "Setting up Python environment..."
export PYTHONPATH=$PWD:$PYTHONPATH

# 2. Run the deployment
echo "Running deployment script..."
python deploy_module_permissions.py

# 3. Sync permissions
echo "Syncing module permissions..."
python iceplant_portal/manage.py sync_module_permissions

# 4. Restart services if needed
echo -e "\033[32mDeployment complete!\033[0m"
echo "Please restart your Django server to apply the changes."
"""
    
    # Write the scripts
    try:
        with open(BASE_DIR / "deploy_module_permissions.ps1", 'w') as f:
            f.write(powershell_script)
        logger.info("Created PowerShell deployment script deploy_module_permissions.ps1")
        
        with open(BASE_DIR / "deploy_module_permissions.sh", 'w') as f:
            f.write(bash_script)
        os.chmod(BASE_DIR / "deploy_module_permissions.sh", 0o755)
        logger.info("Created Bash deployment script deploy_module_permissions.sh")
        
        return True
    except Exception as e:
        logger.error(f"Error creating deployment scripts: {e}")
        return False

def create_documentation():
    """Create documentation for the module permissions system"""
    doc_file = BASE_DIR / "COMPREHENSIVE_MODULE_PERMISSIONS_FIX.md"
    
    content = """# Comprehensive Module Permissions Fix

## Problem Overview

The module permissions system had two critical issues:

1. **Persistence Issue**: Module permissions assigned to groups (especially HR Payrol) weren't persisting after server restarts
2. **Admin Interface Issue**: Module permissions weren't showing up in the Django admin interface

These issues were caused by:

- File path inconsistency: Permissions were saved to inconsistent locations
- Disconnection between HasModulePermission system and Django's permission system
- Lack of synchronization between the frontend and backend permission systems

## Solution Implemented

The comprehensive solution implements:

1. **Enhanced Module Permissions System**
   - Connects custom HasModulePermission with Django's permission system
   - Creates proper Django permissions for each module
   - Ensures permissions are visible in the Django admin interface

2. **Improved Persistence**
   - Saves permissions to multiple standard locations
   - Uses absolute paths instead of relative paths
   - Provides better error handling and logging

3. **Automatic Synchronization**
   - API endpoints automatically update both systems
   - Django app initialization syncs permissions on startup
   - Management command allows manual syncing when needed

## Key Components

### 1. `module_permissions_system.py`
Core module that provides the integration between systems

### 2. Enhanced API Views
Updated `update_group_module_permissions` to use the new system

### 3. Management Command
Added `sync_module_permissions` command for manual operations

### 4. Auto-Initialization
App config auto-initializes the system on startup

## Deployment Instructions

1. **Automatic Deployment**
   ```powershell
   # Windows
   ./deploy_module_permissions.ps1
   ```

   ```bash
   # Linux/Mac
   ./deploy_module_permissions.sh
   ```

2. **Manual Sync**
   ```
   python manage.py sync_module_permissions
   ```

3. **Group-Specific Sync**
   ```
   python manage.py sync_module_permissions --group "HR Payrol"
   ```

## Verification Steps

1. Restart the Django server
2. Log into the admin interface
3. View the HR Payrol group permissions
4. Confirm that "Can access attendance module" and "Can access expenses module" are checked
5. Test module access by logging in as an HR Payrol user

## Benefits

- **Reliability**: Permissions persist across server restarts
- **Visibility**: Permissions appear in the Django admin interface
- **Integration**: Both permission systems stay in sync
- **Maintainability**: Better code structure and documentation

## Documentation

For more detailed information, see:
- `MODULE_PERMISSIONS_SYSTEM_GUIDE.md`: Complete technical guide
- `module_permissions_system.py`: Core implementation with detailed comments

## Support

If you encounter any issues, use the test_module_permissions.py script to diagnose and fix permission problems.
"""
    
    try:
        with open(doc_file, 'w') as f:
            f.write(content)
        logger.info(f"Created documentation at {doc_file}")
        return True
    except Exception as e:
        logger.error(f"Error creating documentation: {e}")
        return False

def main():
    """Main deployment function"""
    logger.info("Starting module permissions system deployment")
    
    # Create the module permissions system
    if create_module_permissions_system():
        logger.info("Successfully created module_permissions_system.py")
    else:
        logger.error("Failed to create module_permissions_system.py")
        
    # Create the management command
    if create_management_command():
        logger.info("Successfully created management command")
    else:
        logger.error("Failed to create management command")
        
    # Update the app config
    if update_app_config():
        logger.info("Successfully updated app config")
    else:
        logger.error("Failed to update app config")
        
    # Update the API views
    if update_api_views_groups():
        logger.info("Successfully updated API views")
    else:
        logger.error("Failed to update API views")
        
    # Update the module permissions utils
    if update_module_permissions_utils():
        logger.info("Successfully updated module permissions utils")
    else:
        logger.error("Failed to update module permissions utils")
        
    # Create deployment scripts
    if create_deployment_scripts():
        logger.info("Successfully created deployment scripts")
    else:
        logger.error("Failed to create deployment scripts")
        
    # Create documentation
    if create_documentation():
        logger.info("Successfully created documentation")
    else:
        logger.error("Failed to create documentation")
        
    logger.info(f"Deployment completed. Log saved to {log_filename}")
    
    print(f"""
============================================
Module Permissions System Deployment Complete
============================================

What was deployed:
1. Core module permissions system
2. Django management command
3. App configuration
4. API views integration
5. Updated utilities
6. Deployment scripts
7. Documentation

Next steps:
1. Run the Django management command to sync permissions:
   python iceplant_portal/manage.py sync_module_permissions
   
2. Restart your Django server

3. Verify that HR Payrol group has the correct permissions
   in the Django admin interface

For more information, see COMPREHENSIVE_MODULE_PERMISSIONS_FIX.md
    """)

if __name__ == "__main__":
    main()
