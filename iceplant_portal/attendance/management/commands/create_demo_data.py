from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import random
from attendance.models import Attendance
from sales.models import Sale
from inventory.models import Inventory, InventoryAdjustment
from expenses.models import Expense

class Command(BaseCommand):
    help = 'Creates demo data for testing purposes'

    def handle(self, *args, **kwargs):
        self.stdout.write('Creating demo data...')
        
        # Create Attendance Records
        employees = ['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005']
        departments = ['Production', 'Sales', 'Maintenance', 'Admin', 'Delivery']
        
        for i in range(50):  # Create 50 attendance records
            check_in_time = timezone.now() - timedelta(days=random.randint(0, 30))
            check_out_time = check_in_time + timedelta(hours=random.randint(6, 10))
            
            Attendance.objects.create(
                employee_id=random.choice(employees),
                check_in=check_in_time,
                check_out=check_out_time,
                department=random.choice(departments)
            )
        self.stdout.write('Created attendance records')

        # Create Sales Records
        buyer_names = ['ABC Company', 'XYZ Corp', 'Local Store', 'Ice Dealer', 'Restaurant Chain']
        
        for i in range(30):  # Create 30 sales records
            Sale.objects.create(
                quantity=random.randint(5, 50),
                brine_level=random.choice([1, 2]),
                sale_date=timezone.now() - timedelta(days=random.randint(0, 30)),
                buyer_name=random.choice(buyer_names),
                buyer_contact=f'09{random.randint(100000000, 999999999)}',
                po_number=f'PO-{random.randint(1000, 9999)}',
                payment_method=random.choice(['cash', 'bank_transfer']),
                delivery_method=random.choice(['pickup', 'delivery']),
                notes=random.choice(['Regular customer', 'Bulk order', 'Rush delivery', None])
            )
        self.stdout.write('Created sales records')

        # Create Inventory Records
        inventory_items = [
            {'name': 'Ice Blocks', 'quantity': 100, 'unit': 'blocks', 'min_level': 20},
            {'name': 'Water', 'quantity': 5000, 'unit': 'liters', 'min_level': 1000},
            {'name': 'Salt', 'quantity': 500, 'unit': 'kg', 'min_level': 100},
            {'name': 'Packaging Material', 'quantity': 200, 'unit': 'pieces', 'min_level': 50}
        ]
        
        for item in inventory_items:
            inventory = Inventory.objects.create(
                item_name=item['name'],
                quantity=item['quantity'],
                unit=item['unit'],
                minimum_level=item['min_level']
            )
            
            # Create some adjustment records
            for _ in range(5):
                prev_qty = inventory.quantity
                new_qty = prev_qty + random.randint(-20, 20)
                if new_qty < 0:
                    new_qty = 0
                
                InventoryAdjustment.objects.create(
                    inventory=inventory,
                    previous_quantity=prev_qty,
                    new_quantity=new_qty,
                    reason=random.choice(['Restock', 'Usage', 'Loss', 'Correction']),
                    adjusted_by='admin'
                )
                inventory.quantity = new_qty
                inventory.save()
        self.stdout.write('Created inventory records')

        # Create Expense Records
        expense_categories = ['utilities', 'maintenance', 'salaries', 'raw_materials', 'equipment']
        vendors = ['Power Company', 'Maintenance Service', 'Equipment Supplier', 'Salt Supplier', 'Water Company']
        
        for i in range(40):  # Create 40 expense records
            Expense.objects.create(
                description=f'Monthly {random.choice(expense_categories).title()}',
                amount=random.uniform(1000, 50000),
                purchase_date=timezone.now() - timedelta(days=random.randint(0, 30)),
                vendor=random.choice(vendors),
                category=random.choice(expense_categories),
                notes=random.choice(['Regular expense', 'Emergency repair', 'Monthly bill', None])
            )
        self.stdout.write('Created expense records')

        self.stdout.write(self.style.SUCCESS('Successfully created all demo data')) 