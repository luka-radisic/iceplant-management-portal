import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iceplant_core.settings')
django.setup()

from inventory.models import Inventory

# Default inventory items
INVENTORY_ITEMS = [
    {
        'item_name': 'Ice Blocks',
        'quantity': 100,
        'unit': 'blocks',
        'minimum_level': 20
    },
    {
        'item_name': 'Water',
        'quantity': 5000,
        'unit': 'liters',
        'minimum_level': 1000
    },
    {
        'item_name': 'Salt',
        'quantity': 500,
        'unit': 'kg',
        'minimum_level': 100
    },
    {
        'item_name': 'Packaging Material',
        'quantity': 200,
        'unit': 'pieces',
        'minimum_level': 50
    },
]

def create_inventory_items():
    """Create initial inventory items"""
    print("Creating inventory items...")
    for item in INVENTORY_ITEMS:
        inventory, created = Inventory.objects.get_or_create(
            item_name=item['item_name'],
            defaults={
                'quantity': item['quantity'],
                'unit': item['unit'],
                'minimum_level': item['minimum_level']
            }
        )
        if created:
            print(f"Created: {inventory}")
        else:
            print(f"Already exists: {inventory}")

if __name__ == '__main__':
    create_inventory_items()
    print("Initial data loaded successfully") 