from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import Group, Permission
import logging
import json
import sys

# Set up logging
logger = logging.getLogger(__name__)
handler = logging.StreamHandler(sys.stdout)
formatter = logging.Formatter('%(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

class Command(BaseCommand):
    help = 'Manage module permissions for groups'

    def add_arguments(self, parser):
        parser.add_argument('--list', action='store_true', help='List current module permissions')
        parser.add_argument('--sync', action='store_true', help='Sync module permissions with Django permissions')
        parser.add_argument('--check', action='store_true', help='Check if permissions in mapping exist')
        parser.add_argument('--add-module', help='Add a module to a group', metavar=('MODULE,GROUP'))
        parser.add_argument('--remove-module', help='Remove a module from a group', metavar=('MODULE,GROUP'))
        parser.add_argument('--export', help='Export module permissions to a file')
        parser.add_argument('--import', dest='import_file', help='Import module permissions from a file')
        parser.add_argument('--assign-all', action='store_true', help='Assign all modules to a group')
        parser.add_argument('--group', help='Group name for assign-all operation')
        parser.add_argument('--clear', help='Clear all module permissions for a group')

    def handle(self, *args, **options):
        try:
            from iceplant_core.group_permissions import HasModulePermission, MODULE_PERMISSION_MAPPING
            from iceplant_core.module_permissions_utils import (
                save_module_permissions, load_module_permissions,
                assign_module_permissions_to_group, remove_module_permissions_from_group,
                sync_module_permissions
            )
            
            # List current module permissions
            if options['list']:
                self.list_module_permissions(HasModulePermission.MODULE_GROUP_MAPPING)
                
            # Sync module permissions with Django permissions
            elif options['sync']:
                logger.info("Synchronizing module permissions with Django permissions...")
                if sync_module_permissions():
                    save_module_permissions()
                    logger.info("Module permissions synchronized and saved successfully")
                else:
                    logger.error("Error synchronizing module permissions")
                    
            # Check if permissions in mapping exist
            elif options['check']:
                self.check_permissions_exist(MODULE_PERMISSION_MAPPING)
                
            # Add a module to a group
            elif options['add_module']:
                try:
                    module, group = options['add_module'].split(',')
                    self.add_module_to_group(module, group, HasModulePermission.MODULE_GROUP_MAPPING)
                    save_module_permissions()
                    assign_module_permissions_to_group(module, group)
                    logger.info(f"Added module {module} to group {group} and assigned permissions")
                except ValueError:
                    logger.error("Invalid format. Use --add-module MODULE,GROUP")
                    
            # Remove a module from a group
            elif options['remove_module']:
                try:
                    module, group = options['remove_module'].split(',')
                    self.remove_module_from_group(module, group, HasModulePermission.MODULE_GROUP_MAPPING)
                    save_module_permissions()
                    remove_module_permissions_from_group(module, group)
                    logger.info(f"Removed module {module} from group {group} and revoked permissions")
                except ValueError:
                    logger.error("Invalid format. Use --remove-module MODULE,GROUP")
                    
            # Export module permissions to a file
            elif options['export']:
                with open(options['export'], 'w') as f:
                    json.dump(HasModulePermission.MODULE_GROUP_MAPPING, f, indent=2)
                logger.info(f"Module permissions exported to {options['export']}")
                
            # Import module permissions from a file
            elif options['import_file']:
                try:
                    with open(options['import_file'], 'r') as f:
                        module_mapping = json.load(f)
                    HasModulePermission.MODULE_GROUP_MAPPING.update(module_mapping)
                    save_module_permissions()
                    sync_module_permissions()
                    logger.info(f"Module permissions imported from {options['import_file']} and synchronized")
                except Exception as e:
                    logger.error(f"Error importing module permissions: {e}")
                    
            # Assign all modules to a group
            elif options['assign_all'] and options['group']:
                for module in HasModulePermission.MODULE_GROUP_MAPPING:
                    if options['group'] not in HasModulePermission.MODULE_GROUP_MAPPING[module]:
                        HasModulePermission.MODULE_GROUP_MAPPING[module].append(options['group'])
                        assign_module_permissions_to_group(module, options['group'])
                save_module_permissions()
                logger.info(f"Assigned all modules to group {options['group']}")
                
            # Clear all module permissions for a group
            elif options['clear']:
                group = options['clear']
                for module in HasModulePermission.MODULE_GROUP_MAPPING:
                    if group in HasModulePermission.MODULE_GROUP_MAPPING[module]:
                        HasModulePermission.MODULE_GROUP_MAPPING[module].remove(group)
                        remove_module_permissions_from_group(module, group)
                save_module_permissions()
                logger.info(f"Cleared all module permissions for group {group}")
                
            else:
                logger.info("No action specified. Use --help to see available options.")
                
        except ImportError as e:
            logger.error(f"Error importing required modules: {e}")
        except Exception as e:
            logger.error(f"Error: {e}")
    
    def list_module_permissions(self, mapping):
        """List current module permissions"""
        logger.info("Current module permissions:")
        logger.info(json.dumps(mapping, indent=2))
        
        # Also show Django group permissions
        logger.info("\nGroups and their permissions:")
        for group in Group.objects.all():
            logger.info(f"\n{group.name} (ID: {group.id}):")
            permissions = group.permissions.all()
            if permissions:
                for perm in permissions:
                    logger.info(f"  - {perm.content_type.app_label}.{perm.codename}")
            else:
                logger.info("  No permissions assigned")
    
    def check_permissions_exist(self, mapping):
        """Check if permissions in mapping exist"""
        logger.info("Checking if permissions in mapping exist...")
        
        all_exist = True
        for module, permissions in mapping.items():
            logger.info(f"\nModule: {module}")
            for perm_name in permissions:
                try:
                    app_label, codename = perm_name.split('.')
                    permission = Permission.objects.get(
                        content_type__app_label=app_label,
                        codename=codename
                    )
                    logger.info(f"  ✓ {perm_name}")
                except Permission.DoesNotExist:
                    logger.info(f"  ✗ {perm_name} (does not exist)")
                    all_exist = False
        
        if all_exist:
            logger.info("\nAll permissions in mapping exist")
        else:
            logger.info("\nSome permissions in mapping do not exist")
    
    def add_module_to_group(self, module, group, mapping):
        """Add a module to a group"""
        if not Group.objects.filter(name=group).exists():
            logger.error(f"Group {group} does not exist")
            return False
            
        if module not in mapping:
            logger.error(f"Module {module} does not exist")
            return False
            
        if group in mapping[module]:
            logger.info(f"Group {group} already has access to {module}")
            return False
            
        mapping[module].append(group)
        return True
    
    def remove_module_from_group(self, module, group, mapping):
        """Remove a module from a group"""
        if not Group.objects.filter(name=group).exists():
            logger.error(f"Group {group} does not exist")
            return False
            
        if module not in mapping:
            logger.error(f"Module {module} does not exist")
            return False
            
        if group not in mapping[module]:
            logger.info(f"Group {group} doesn't have access to {module}")
            return False
            
        mapping[module].remove(group)
        return True
