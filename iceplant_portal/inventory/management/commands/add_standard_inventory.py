from django.core.management.base import BaseCommand
from inventory.models import Inventory
from django.db import transaction

class Command(BaseCommand):
    help = 'Adds standard inventory items for an ice plant'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Adding standard inventory items...'))

        # Define standard inventory items for an ice plant
        standard_items = [
            # Ice Plant Production Materials
            {'item_name': 'Ice Plant', 'quantity': 1, 'unit': 'unit', 'minimum_level': 1},
            {'item_name': 'Salt', 'quantity': 500, 'unit': 'kg', 'minimum_level': 100},
            {'item_name': 'Ammonia', 'quantity': 50, 'unit': 'liter', 'minimum_level': 10},
            {'item_name': 'Coolant Fluid', 'quantity': 30, 'unit': 'liter', 'minimum_level': 5},
            {'item_name': 'Filter Material', 'quantity': 50, 'unit': 'unit', 'minimum_level': 10},
            
            # Maintenance Tools and Supplies
            {'item_name': 'Spanners', 'quantity': 20, 'unit': 'unit', 'minimum_level': 5},
            {'item_name': 'Screwdrivers', 'quantity': 15, 'unit': 'unit', 'minimum_level': 3},
            {'item_name': 'Gloves', 'quantity': 50, 'unit': 'pair', 'minimum_level': 10},
            {'item_name': 'Safety Glasses', 'quantity': 25, 'unit': 'unit', 'minimum_level': 5},
            {'item_name': 'Hard Hats', 'quantity': 15, 'unit': 'unit', 'minimum_level': 3},
            {'item_name': 'Safety Boots', 'quantity': 15, 'unit': 'pair', 'minimum_level': 3},
            {'item_name': 'Maintenance Log Books', 'quantity': 10, 'unit': 'book', 'minimum_level': 3},
            {'item_name': 'Lubricant Oil', 'quantity': 20, 'unit': 'liter', 'minimum_level': 5},
            {'item_name': 'Gaskets', 'quantity': 30, 'unit': 'unit', 'minimum_level': 10},
            {'item_name': 'Pressure Gauges', 'quantity': 5, 'unit': 'unit', 'minimum_level': 2},
            
            # Packaging Materials
            {'item_name': 'Ice Bags', 'quantity': 1000, 'unit': 'unit', 'minimum_level': 200},
            {'item_name': 'Packaging Tape', 'quantity': 50, 'unit': 'roll', 'minimum_level': 10},
            {'item_name': 'Box Strapping', 'quantity': 30, 'unit': 'roll', 'minimum_level': 5},
            {'item_name': 'Labels', 'quantity': 1000, 'unit': 'unit', 'minimum_level': 200},
            
            # Office Supplies
            {'item_name': 'Printer Paper', 'quantity': 20, 'unit': 'ream', 'minimum_level': 5},
            {'item_name': 'Pens', 'quantity': 50, 'unit': 'unit', 'minimum_level': 10},
            {'item_name': 'Staplers', 'quantity': 5, 'unit': 'unit', 'minimum_level': 2},
            {'item_name': 'Staples', 'quantity': 10, 'unit': 'box', 'minimum_level': 3},
            {'item_name': 'Ink Cartridges', 'quantity': 10, 'unit': 'unit', 'minimum_level': 3},
            {'item_name': 'Whiteboard Markers', 'quantity': 20, 'unit': 'unit', 'minimum_level': 5},
            {'item_name': 'Notebooks', 'quantity': 15, 'unit': 'unit', 'minimum_level': 5},
            
            # Cleaning Supplies
            {'item_name': 'Floor Cleaner', 'quantity': 10, 'unit': 'liter', 'minimum_level': 3},
            {'item_name': 'Disinfectant', 'quantity': 15, 'unit': 'liter', 'minimum_level': 3},
            {'item_name': 'Mops', 'quantity': 5, 'unit': 'unit', 'minimum_level': 2},
            {'item_name': 'Brooms', 'quantity': 5, 'unit': 'unit', 'minimum_level': 2},
            {'item_name': 'Dustpans', 'quantity': 5, 'unit': 'unit', 'minimum_level': 2},
            {'item_name': 'Garbage Bags', 'quantity': 100, 'unit': 'unit', 'minimum_level': 20},
            {'item_name': 'Paper Towels', 'quantity': 30, 'unit': 'roll', 'minimum_level': 10},
        ]

        # Use a transaction to ensure all items are added or none
        with transaction.atomic():
            items_created = 0
            items_skipped = 0
            
            for item_data in standard_items:
                # Check if item already exists
                if not Inventory.objects.filter(item_name=item_data['item_name']).exists():
                    Inventory.objects.create(**item_data)
                    items_created += 1
                    self.stdout.write(f"Added: {item_data['item_name']}")
                else:
                    items_skipped += 1
                    self.stdout.write(f"Skipped (already exists): {item_data['item_name']}")
        
        self.stdout.write(self.style.SUCCESS(f'Done! Added {items_created} new items, skipped {items_skipped} existing items.')) 