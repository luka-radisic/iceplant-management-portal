#!/usr/bin/env python
"""
Management command to verify and fix module mappings.
This ensures all modules in MODULE_GROUP_MAPPING are also in MODULE_PERMISSION_MAPPING.
"""

from django.core.management.base import BaseCommand
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Verify and fix module mappings'

    def handle(self, *args, **options):
        self.stdout.write("Starting module mapping verification...")
        self.verify_module_mappings()
        self.sync_modules()
        self.stdout.write(self.style.SUCCESS("Done!"))
    
    def verify_module_mappings(self):
        """
        Verify that all modules in MODULE_GROUP_MAPPING are in MODULE_PERMISSION_MAPPING and vice versa.
        """
        from iceplant_core.group_permissions import HasModulePermission
        from iceplant_core.module_permissions_utils import MODULE_PERMISSION_MAPPING
        
        group_mapping = HasModulePermission.MODULE_GROUP_MAPPING
        permission_mapping = MODULE_PERMISSION_MAPPING
        
        # Check for modules in group mapping but not in permission mapping
        group_modules = set(group_mapping.keys())
        permission_modules = set(permission_mapping.keys())
        
        missing_in_permissions = group_modules - permission_modules
        missing_in_groups = permission_modules - group_modules
        
        self.stdout.write("=== Module Mapping Verification ===")
        
        if missing_in_permissions:
            self.stdout.write(self.style.WARNING(
                f"Modules in GROUP_MAPPING but missing in PERMISSION_MAPPING: {missing_in_permissions}"
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                "All modules in GROUP_MAPPING are also in PERMISSION_MAPPING."
            ))
        
        if missing_in_groups:
            self.stdout.write(self.style.WARNING(
                f"Modules in PERMISSION_MAPPING but missing in GROUP_MAPPING: {missing_in_groups}"
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                "All modules in PERMISSION_MAPPING are also in GROUP_MAPPING."
            ))
        
        # Verify each module's permissions
        self.stdout.write("\n=== Module Permissions Detail ===")
        for module in sorted(permission_modules):
            perms = permission_mapping.get(module, [])
            self.stdout.write(f"Module '{module}': {len(perms)} permission(s)")
            if not perms:
                self.stdout.write(self.style.WARNING(
                    f"  WARNING: Module '{module}' has no permissions defined"
                ))
    
    def sync_modules(self):
        """
        Synchronize module permissions based on the current mapping.
        """
        from iceplant_core.module_permissions_utils import sync_module_permissions, save_module_permissions
        
        self.stdout.write("\n=== Synchronizing Module Permissions ===")
        if sync_module_permissions():
            save_module_permissions()
            self.stdout.write(self.style.SUCCESS(
                "Module permissions synchronized and saved successfully."
            ))
        else:
            self.stdout.write(self.style.ERROR(
                "Error synchronizing module permissions."
            ))
