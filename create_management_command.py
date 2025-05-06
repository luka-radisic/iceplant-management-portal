#!/usr/bin/env python
"""
Direct database fix for module permissions.
This script will create a management command to clean up module permissions.
"""

import os
import sys
from pathlib import Path

def create_management_command():
    """Create a Django management command to clean up module permissions"""
    
    # Directory structure for the management command
    BASE_DIR = "/app/iceplant_portal"
    CORE_DIR = os.path.join(BASE_DIR, "iceplant_core")
    MANAGEMENT_DIR = os.path.join(CORE_DIR, "management")
    COMMANDS_DIR = os.path.join(MANAGEMENT_DIR, "commands")
    
    # Create directories if they don't exist
    os.makedirs(COMMANDS_DIR, exist_ok=True)
    
    # Create __init__.py files if they don't exist
    init_files = [
        os.path.join(MANAGEMENT_DIR, "__init__.py"),
        os.path.join(COMMANDS_DIR, "__init__.py")
    ]
    
    for init_file in init_files:
        if not os.path.exists(init_file):
            with open(init_file, "w") as f:
                f.write("")
    
    # Create the management command
    command_file = os.path.join(COMMANDS_DIR, "fixmoduleperms.py")
      command_content = '''#!/usr/bin/env python
from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
import logging

# Set up logging
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Fix module permissions by ensuring they match the module mapping"
    
    def add_arguments(self, parser):
        parser.add_argument(
            "--clean",
            action="store_true",
            help="Clean up permissions for all groups",
        )
        parser.add_argument(
            "--group",
            type=str,
            help="Fix permissions for a specific group",
        )
        parser.add_argument(
            "--module",
            type=str,
            help="Fix permissions for a specific module",
        )
    
    def handle(self, *args, **options):
        from iceplant_core.group_permissions import HasModulePermission
        from iceplant_core.module_permissions_utils import MODULE_PERMISSION_MAPPING
        
        clean_all = options["clean"]
        group_name = options["group"]
        module_name = options["module"]
        
        # Get the module mapping
        module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
        
        self.stdout.write(f"Current module mapping: {module_mapping}")
        
        # Process specific group if specified
        if group_name:
            try:
                group = Group.objects.get(name=group_name)
                self.stdout.write(f"Processing group {group_name}...")
                
                # Process specific module if specified
                if module_name:
                    self.fix_module_permissions(group, module_name, module_mapping)
                else:
                    # Process all modules for this group
                    for module in MODULE_PERMISSION_MAPPING.keys():
                        self.fix_module_permissions(group, module, module_mapping)
                        
                self.stdout.write(self.style.SUCCESS(f"Fixed permissions for group \'{group_name}\'"))
            except Group.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Group \'{group_name}\' does not exist"))
        
        # Process all groups if clean flag is set
        elif clean_all:
            self.stdout.write("Cleaning up permissions for all groups...")
            
            # Get all groups
            groups = Group.objects.all()
            
            for group in groups:
                self.stdout.write(f"Processing group \'{group.name}\'...")
                
                # Process all modules
                for module in MODULE_PERMISSION_MAPPING.keys():
                    self.fix_module_permissions(group, module, module_mapping)
            
            self.stdout.write(self.style.SUCCESS("Cleaned up all module permissions"))
        
        else:
            self.stdout.write(self.style.WARNING("No action specified. Use --clean, --group, or --module"))
    
    def fix_module_permissions(self, group, module, module_mapping):
        """Fix permissions for a group and module"""
        from iceplant_core.module_permissions_utils import MODULE_PERMISSION_MAPPING
        
        # Check if group should have this module\'s permissions
        should_have_perms = group.name in module_mapping.get(module, [])
        
        # Get all permissions for this module
        perm_names = MODULE_PERMISSION_MAPPING.get(module, [])
        module_perms = []
        
        for perm_name in perm_names:
            try:
                app_label, codename = perm_name.split(\'.\')
                perm = Permission.objects.get(
                    content_type__app_label=app_label,
                    codename=codename
                )
                module_perms.append(perm)
            except Permission.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"Permission {perm_name} does not exist"))
                continue
        
        # Get permissions this group currently has for this module
        current_perms = [p for p in group.permissions.all() 
                        if any(p.codename == perm.codename and 
                               p.content_type.app_label == perm.content_type.app_label 
                               for perm in module_perms)]
        
        # If group should have permissions but doesn\'t have all of them
        if should_have_perms and len(current_perms) < len(module_perms):
            self.stdout.write(f"Group \'{group.name}\' missing permissions for module \'{module}\' - adding...")
            
            for perm in module_perms:
                if perm not in current_perms:
                    group.permissions.add(perm)
                    self.stdout.write(f"  Added {perm.content_type.app_label}.{perm.codename}")
        
        # If group should not have permissions but has some
        elif not should_have_perms and current_perms:
            self.stdout.write(f"Group \'{group.name}\' has incorrect permissions for module \'{module}\' - removing...")
            
            for perm in current_perms:
                group.permissions.remove(perm)
                self.stdout.write(f"  Removed {perm.content_type.app_label}.{perm.codename}")
'''
    
    with open(command_file, "w") as f:
        f.write(command_content)
    
    print(f"Created management command at {command_file}")
    
    return command_file

if __name__ == "__main__":
    print("Creating management command for module permissions cleanup...")
    command_path = create_management_command()
    print("\nCommand created successfully!")
    print("\nUsage:")
    print("  python manage.py fixmoduleperms --clean     # Clean all permissions")
    print("  python manage.py fixmoduleperms --group=<group_name>  # Fix specific group")
    print("  python manage.py fixmoduleperms --group=<group_name> --module=<module_name>  # Fix specific module for group")
