"""
Django management command to initialize or refresh module permissions.

This command creates or updates Django permissions for all modules
and synchronizes them with the HasModulePermission system.

Usage:
    python manage.py sync_module_permissions [--group GROUP_NAME]
"""
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
