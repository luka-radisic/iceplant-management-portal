"""
Management command to sync module-based permissions with Django permissions.
"""
from django.core.management.base import BaseCommand
from iceplant_core.module_permissions import sync_all_module_permissions

class Command(BaseCommand):
    help = 'Synchronize module-based permissions with Django permissions for all groups'
    
    def handle(self, *args, **options):
        self.stdout.write('Syncing module permissions with Django permissions...')
        
        result = sync_all_module_permissions()
        
        if result:
            self.stdout.write(self.style.SUCCESS('Successfully synchronized module permissions'))
        else:
            self.stdout.write(self.style.ERROR('Failed to synchronize module permissions'))
