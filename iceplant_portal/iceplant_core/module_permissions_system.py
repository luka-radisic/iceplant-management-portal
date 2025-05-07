"""
Module Permissions System

This module provides a comprehensive system to connect the HasModulePermission system
with Django's built-in permission system, ensuring that module permissions are properly
reflected in the Django admin interface.

Key features:
- Creates Django permissions for each module
- Updates Django permissions when module permissions are updated
- Synchronizes Django permissions with HasModulePermission module mappings
"""
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
    """Get absolute paths for all standard locations"""
    return [os.path.abspath(location) for location in STANDARD_LOCATIONS]

def get_module_permission_content_type():
    """Get or create a content type for module permissions"""
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
    """Create a Django permission for a module"""
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
    """Create Django permissions for all modules in the system"""
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
    """Get the Django permission for a module"""
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
    """
    Synchronize Django permissions with HasModulePermission module mappings
    for a specific group
    """
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
    """Synchronize Django permissions with HasModulePermission for all groups"""
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
    """Save the current module permissions to all standard JSON file locations"""
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
    """Load module permissions from any available standard location"""
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
    """
    Update module access for a group and sync with Django permissions
    
    Args:
        group_name: The name of the group to update
        module_mappings: A dict mapping module names to boolean access values
                        e.g. {'attendance': True, 'sales': False}
    
    Returns:
        bool: Success flag
    """
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
    """
    Initialize the module permission system by:
    1. Loading the latest module permissions
    2. Creating all module permissions in Django
    3. Syncing all group permissions
    
    This should be run during application startup or when 
    the permission system needs to be reset.
    """
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
