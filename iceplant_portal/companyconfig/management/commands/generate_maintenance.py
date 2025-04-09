import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from maintenance.models import MaintenanceItem, MaintenanceRecord

EQUIPMENT = [
    "Brine Tank 1", "Brine Tank 2", "Brine Tank 3",
    "Compressor Unit 1", "Compressor Unit 2",
    "Ice Block Molds", "Delivery Truck ABC-1234",
    "Refrigeration Unit A", "Refrigeration Unit B",
    "Welding Machine", "Cutting Machine"
]

DESCRIPTIONS = [
    "Routine cleaning", "Oil change", "Leak repair", "Electrical inspection",
    "Parts replacement", "Calibration", "Pressure test", "Filter replacement"
]

STATUSES = ["Completed", "Scheduled", "In Progress"]

def random_date():
    start = timezone.datetime(2025, 1, 1, tzinfo=timezone.get_current_timezone())
    end = timezone.now()
    return start + (end - start) * random.random()

class Command(BaseCommand):
    help = 'Generate realistic Filipino maintenance data'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Delete existing maintenance data before generating')
        parser.add_argument('--volume', type=int, default=30, help='Number of maintenance records to generate')

    def handle(self, *args, **options):
        if options['reset']:
            MaintenanceRecord.objects.all().delete()
            MaintenanceItem.objects.all().delete()
            self.stdout.write(self.style.WARNING('Existing maintenance data deleted.'))

        # Create equipment items
        equipment_objs = []
        for eq_name in EQUIPMENT:
            eq, _ = MaintenanceItem.objects.get_or_create(name=eq_name)
            equipment_objs.append(eq)

        volume = options['volume']
        for _ in range(volume):
            equipment = random.choice(equipment_objs)
            description = random.choice(DESCRIPTIONS)
            cost = random.randint(1000, 50000)
            date = random_date().date()
            status = random.choice(STATUSES)

            MaintenanceRecord.objects.create(
                equipment=equipment,
                description=description,
                cost=cost,
                maintenance_date=date,
                status=status,
            )

        self.stdout.write(self.style.SUCCESS(f'{volume} maintenance records generated successfully.'))