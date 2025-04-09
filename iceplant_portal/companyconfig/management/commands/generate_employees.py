import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from attendance.models import EmployeeProfile

DEPARTMENTS = ['Harvester', 'Operator', 'Driver', 'Admin']

class Command(BaseCommand):
    help = 'Generate realistic Filipino employee profiles'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Delete existing employee profiles before generating')
        parser.add_argument('--volume', type=int, default=50, help='Number of employees to generate')

    def handle(self, *args, **options):
        if options['reset']:
            EmployeeProfile.objects.all().delete()
            self.stdout.write(self.style.WARNING('Existing employee profiles deleted.'))

        volume = options['volume']
        for i in range(1, volume + 1):
            EmployeeProfile.objects.update_or_create(
                employee_id=str(100 + i),
                defaults={
                    'full_name': f'Employee {i}',
                    'photo': '',
                    'department': DEPARTMENTS[i % len(DEPARTMENTS)],
                    'position': 'Worker',
                    'date_joined': '2025-03-01',
                    'is_active': True,
                    'track_shifts': False,
                    'department_track_shifts': False,
                    'created_at': timezone.now(),
                    'updated_at': timezone.now(),
                }
            )
        self.stdout.write(self.style.SUCCESS(f'{volume} employee profiles generated successfully.'))