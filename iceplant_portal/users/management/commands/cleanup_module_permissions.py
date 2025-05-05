"""
Management command to clean up and fix module permissions
"""
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import Group
from iceplant_core.group_permissions import HasModulePermission
import json

class Command(BaseCommand):
    help = 'Clean up module permissions and see current state'

    def add_arguments(self, parser):
        parser.add_argument(
            '--save-to-db',
            action='store_true',
            help='Save the module permissions to the database',
        )

    def handle(self, *args, **options):
        """Handle the command"""
        self.stdout.write(self.style.SUCCESS('Cleaning up module permissions...'))
        
        # Get all existing group names
        existing_groups = set(Group.objects.values_list('name', flat=True))
        self.stdout.write(f"Existing groups: {', '.join(existing_groups)}")
        
        # Clean up MODULE_GROUP_MAPPING
        module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
        modified = False
        
        for module, groups in module_mapping.items():
            # Filter out groups that no longer exist
            valid_groups = [g for g in groups if g in existing_groups]
            
            if len(valid_groups) != len(groups):
                self.stdout.write(self.style.WARNING(
                    f"Module {module}: Removed non-existent groups. Before: {groups}, After: {valid_groups}"
                ))
                module_mapping[module] = valid_groups
                modified = True
        
        if modified:
            self.stdout.write(self.style.SUCCESS("Module permissions were cleaned up."))
        else:
            self.stdout.write(self.style.SUCCESS("No cleanup needed."))
        
        # Print the current state of module permissions
        self.stdout.write("\nCurrent module permissions:")
        formatted_json = json.dumps(module_mapping, indent=2)
        self.stdout.write(formatted_json)
        
        # Create a file to persist the module permissions
        if options['save_to_db']:
            self.stdout.write(self.style.SUCCESS("Writing module permissions to database..."))
            # In a real implementation, this would save to a database or file
            self.stdout.write(self.style.SUCCESS("Changes will be lost on server restart - implement permanent storage"))
            
        return module_mapping
