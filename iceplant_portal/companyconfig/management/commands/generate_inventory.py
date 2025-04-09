import random
from django.core.management.base import BaseCommand
from inventory.models import InventoryItem

INVENTORY_ITEMS = [
    # Ice plant
    ("Ice Block (150kg)", "blocks", 20),
    ("Salt (NaCl)", "sacks", 5),
    ("Ammonia Refrigerant", "tanks", 2),
    ("Plastic Packaging", "rolls", 10),
    # Metal forming
    ("Steel Sheets 4x8", "sheets", 50),
    ("Welding Rods", "boxes", 5),
    ("Cutting Discs", "pieces", 20),
    ("Bolts and Nuts", "sets", 100),
    ("Paint (1L)", "cans", 10),
    ("Steel Bars", "pieces", 30),
    ("Angle Bars", "pieces", 30),
    ("Metal Plates", "sheets", 20),
]

class Command(BaseCommand):
    help = 'Generate realistic Filipino-context inventory items'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Delete existing inventory before generating')
        parser.add_argument('--volume', type=int, default=20, help='Number of inventory items to generate (max capped)')

    def handle(self, *args, **options):
        if options['reset']:
            InventoryItem.objects.all().delete()
            self.stdout.write(self.style.WARNING('Existing inventory deleted.'))

        volume = min(options['volume'], len(INVENTORY_ITEMS))
        for i in range(volume):
            name, unit, min_level = INVENTORY_ITEMS[i]
            quantity = random.randint(min_level + 5, min_level + 100)

            InventoryItem.objects.update_or_create(
                name=name,
                defaults={
                    'unit': unit,
                    'quantity': quantity,
                    'min_level': min_level,
                }
            )
        self.stdout.write(self.style.SUCCESS(f'{volume} inventory items generated successfully.'))