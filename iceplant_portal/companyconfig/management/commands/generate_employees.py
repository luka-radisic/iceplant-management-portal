import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from companyconfig.models import EmployeeProfile

FILIPINO_NAMES = [
    "Jose Dela Cruz", "Maria Santos", "Juan Reyes", "Ana Bautista", "Carlo Mendoza",
    "Liza Navarro", "Edgar Flores", "Ramon Cruz", "Nina Garcia", "Mark Villanueva",
    "Paolo Torres", "Grace Lim", "Leo Fernandez", "Diana Ramos", "Victor Castillo"
]

DEPARTMENTS = ["Sales", "Inventory", "Finance", "Maintenance", "HR", "Fabrication", "Logistics"]

STATUSES = ["Active", "Inactive"]

class Command(BaseCommand):
    help = 'Generate realistic Filipino employee profiles'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Delete existing employee profiles before generating')
        parser.add_argument('--volume', type=int, default=30, help='Number of employee profiles to generate')

    def handle(self, *args, **options):
        if options['reset']:
            EmployeeProfile.objects.all().delete()
            self.stdout.write(self.style.WARNING('Existing employee profiles deleted.'))

        volume = options['volume']
        for i in range(volume):
            name = random.choice(FILIPINO_NAMES)
            department = random.choice(DEPARTMENTS)
            join_year = random.randint(2018, 2024)
            join_month = random.randint(1, 12)
            join_day = random.randint(1, 28)
            join_date = timezone.datetime(join_year, join_month, join_day).date()
            status = random.choice(STATUSES)
            employee_id = f"EMP-2025-{i+1:03d}"

            EmployeeProfile.objects.update_or_create(
                employee_id=employee_id,
                defaults={
                    'name': name,
                    'department': department,
                    'join_date': join_date,
                    'status': status,
                }
            )
        self.stdout.write(self.style.SUCCESS(f'{volume} employee profiles generated successfully.'))