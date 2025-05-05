"""
Management command to manage module permissions
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group
from iceplant_core.group_permissions import HasModulePermission
import json
import os

class Command(BaseCommand):
    help = 'Manage module permissions - list, update, or clean up'
    
    def add_arguments(self, parser):
        parser.add_argument('--list', action='store_true', 
                            help='List current module permissions')
        parser.add_argument('--cleanup', action='store_true', 
                            help='Clean up module permissions')
        parser.add_argument('--export', action='store_true',
                            help='Export module permissions to a JSON file')
        parser.add_argument('--import', dest='import_file', type=str,
                            help='Import module permissions from a JSON file')
        parser.add_argument('--add-group', nargs=2, metavar=('GROUP', 'MODULE'),
                            help='Add a group to a module permission')
        parser.add_argument('--remove-group', nargs=2, metavar=('GROUP', 'MODULE'),
                            help='Remove a group from a module permission')
    
    def handle(self, *args, **options):
        if options['list']:
            self.list_permissions()
            
        if options['cleanup']:
            self.cleanup_permissions()
            
        if options['export']:
            self.export_permissions()
            
        if options['import_file']:
            self.import_permissions(options['import_file'])
            
        if options['add_group']:
            group_name, module = options['add_group']
            self.add_group_to_module(group_name, module)
            
        if options['remove_group']:
            group_name, module = options['remove_group']
            self.remove_group_from_module(group_name, module)
    
    def list_permissions(self):
        """List current module permissions"""
        self.stdout.write('Current module permissions:')
        for module, groups in HasModulePermission.MODULE_GROUP_MAPPING.items():
            self.stdout.write(f'  {module}: {", ".join(groups)}')
    
    def cleanup_permissions(self):
        """Clean up module permissions by removing non-existent groups"""
        self.stdout.write('Cleaning up module permissions...')
        
        # Get all existing group names
        existing_groups = set(Group.objects.values_list('name', flat=True))
        
        # Clean up MODULE_GROUP_MAPPING
        module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
        modified = False
        
        for module, groups in module_mapping.items():
            # Filter out groups that no longer exist
            valid_groups = [g for g in groups if g in existing_groups]
            
            if len(valid_groups) != len(groups):
                self.stdout.write(f'  Removing non-existent groups from {module} module')
                module_mapping[module] = valid_groups
                modified = True
        
        if modified:
            self.stdout.write(self.style.SUCCESS('Module permissions were cleaned up.'))
        else:
            self.stdout.write('No cleanup needed.')
    
    def export_permissions(self):
        """Export module permissions to a JSON file"""
        filename = 'module_permissions.json'
        with open(filename, 'w') as f:
            json.dump(HasModulePermission.MODULE_GROUP_MAPPING, f, indent=2)
        self.stdout.write(self.style.SUCCESS(f'Module permissions exported to {filename}'))
    
    def import_permissions(self, filename):
        """Import module permissions from a JSON file"""
        if not os.path.exists(filename):
            self.stdout.write(self.style.ERROR(f'File {filename} does not exist'))
            return
            
        try:
            with open(filename, 'r') as f:
                permissions = json.load(f)
                
            # Update module permissions
            HasModulePermission.MODULE_GROUP_MAPPING.update(permissions)
            self.stdout.write(self.style.SUCCESS('Module permissions imported successfully'))
        except json.JSONDecodeError:
            self.stdout.write(self.style.ERROR(f'File {filename} is not valid JSON'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error importing module permissions: {e}'))
    
    def add_group_to_module(self, group_name, module):
        """Add a group to a module permission"""
        module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
        
        # Check if module exists
        if module not in module_mapping:
            self.stdout.write(self.style.ERROR(f'Module {module} does not exist'))
            return
            
        # Check if group exists
        if not Group.objects.filter(name=group_name).exists():
            self.stdout.write(self.style.ERROR(f'Group {group_name} does not exist'))
            return
            
        # Add group to module
        if group_name not in module_mapping[module]:
            module_mapping[module].append(group_name)
            self.stdout.write(self.style.SUCCESS(f'Added {group_name} to {module} module'))
        else:
            self.stdout.write(f'Group {group_name} is already in {module} module')
    
    def remove_group_from_module(self, group_name, module):
        """Remove a group from a module permission"""
        module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
        
        # Check if module exists
        if module not in module_mapping:
            self.stdout.write(self.style.ERROR(f'Module {module} does not exist'))
            return
            
        # Remove group from module
        if group_name in module_mapping[module]:
            module_mapping[module].remove(group_name)
            self.stdout.write(self.style.SUCCESS(f'Removed {group_name} from {module} module'))
        else:
            self.stdout.write(f'Group {group_name} is not in {module} module')
