import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from maintenance.models import MaintenanceItem, MaintenanceRecord

EQUIPMENT = [
    # Ice Plant
    "Brine Tank 1", "Brine Tank 2", "Brine Tank 3",
    "Compressor Unit 1", "Compressor Unit 2",
    "Ice Block Molds", "Refrigeration Unit A", "Refrigeration Unit B",
    # Warehouse
    "Forklift 1", "Forklift 2", "Pallet Jack 1", "Warehouse Conveyor",
    # Office
    "Office Aircon 1", "Office Aircon 2", "Printer A", "Printer B", "Server Rack",
    # Vehicles
    "Delivery Truck ABC-1234", "Delivery Truck XYZ-5678",
    # Workshop
    "Welding Machine", "Cutting Machine", "Drill Press", "Lathe Machine"
]

DESCRIPTIONS = [
    "Routine cleaning", "Oil change", "Leak repair", "Electrical inspection",
    "Parts replacement", "Calibration", "Pressure test", "Filter replacement",
    "Software update", "Firmware upgrade", "Battery replacement", "Coolant refill",
    "Safety inspection", "Emergency repair", "Noise troubleshooting", "Overhaul"
]

STATUSES = ["completed", "scheduled", "in_progress"]

MAINTENANCE_TYPES = ["scheduled", "emergency", "preventive", "corrective"]

ISSUES = [
    "Overheating detected", "Unusual noise", "Leak found", "Electrical fault",
    "Wear and tear", "Calibration drift", "Software bug", "Power failure",
    "Low coolant", "Filter clogging", "Battery low", "Corrosion observed"
]

RECOMMENDATIONS = [
    "Monitor closely", "Schedule follow-up", "Replace worn parts", "Upgrade firmware",
    "Increase inspection frequency", "Train staff", "Order spare parts", "Improve ventilation",
    "Lubricate moving parts", "Check power supply", "Replace filters regularly"
]

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
        equipment_types = ['Compressor', 'Condenser', 'Pump', 'Freezer', 'Vehicle', 'Tool', 'Office Equipment']
        locations = ['Plant A', 'Plant B', 'Warehouse', 'Office']

        for idx, eq_name in enumerate(EQUIPMENT, 1):
            eq, _ = MaintenanceItem.objects.update_or_create(
                equipment_name=eq_name,
                defaults={
                    'equipment_type': random.choice(equipment_types),
                    'model_number': f'MODEL-{idx}',
                    'serial_number': f'SERIAL-{idx}',
                    'location': random.choice(locations),
                    'installation_date': timezone.datetime(2023, 1, 1).date(),
                    'maintenance_frequency': random.choice([1, 3, 6]),
                    'frequency_unit': 'months',
                    'next_maintenance_date': timezone.datetime(2025, 5, 1).date(),
                    'status': 'operational',
                    'notes': 'Auto-generated equipment',
                    'created_at': timezone.now(),
                    'updated_at': timezone.now(),
                }
            )
            equipment_objs.append(eq)

        volume = options['volume']
        for _ in range(volume):
            equipment = random.choice(equipment_objs)
            description = random.choice(DESCRIPTIONS)
            cost = round(random.uniform(500, 50000), 2)
            date = random_date().date()
            status = random.choices(
                ["completed", "scheduled", "in_progress"],
                weights=[0.5, 0.3, 0.2]
            )[0]
            maintenance_type = random.choice(MAINTENANCE_TYPES)
            issue = random.choice(ISSUES)
            recommendation = random.choice(RECOMMENDATIONS)
            performed_by = random.choice(["Technician A", "Technician B", "Vendor X", "Vendor Y", "In-house Staff"])
            duration = round(random.uniform(0.5, 8.0), 1)

            MaintenanceRecord.objects.create(
                maintenance_item=equipment,
                maintenance_type=maintenance_type,
                performed_by=performed_by,
                cost=cost,
                maintenance_date=date,
                status=status,
                issues_found=issue,
                actions_taken=description,
                recommendations=recommendation,
                duration=duration,
                parts_replaced='Filter, Oil',
                created_at=timezone.now(),
                updated_at=timezone.now(),
            )

        self.stdout.write(self.style.SUCCESS(f'{volume} maintenance records generated successfully.'))