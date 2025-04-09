import os
import json
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from attendance.models import EmployeeProfile, Attendance
from inventory.models import Inventory
from buyers.models import Buyer
from sales.models import Sale
from expenses.models import Expense, ExpenseCategory
from companyconfig.models import CompanySettings
from django.db import transaction
from datetime import timedelta
from django.utils import timezone
import random

class Command(BaseCommand):
    help = 'Generate realistic, interconnected sample data'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Clear existing data before generation')
        parser.add_argument('--volume', type=int, default=50, help='Number of records per domain')

    def handle(self, *args, **options):
        reset = options['reset']
        volume = options['volume']

        with transaction.atomic():
            if reset:
                self.stdout.write('Resetting existing data...')
                self.reset_data()

            self.stdout.write('Generating employee profiles...')
            self.generate_employees(volume)

            # Skipping attendance generation as per user instruction

            # Skipping company settings generation as per user instruction

            self.stdout.write('Generating inventory items...')
            self.generate_inventory(volume)

            self.stdout.write('Generating users...')
            self.generate_users()

            self.stdout.write('Generating buyers...')
            self.generate_buyers(volume)

            self.stdout.write('Generating expenses and categories...')
            self.generate_expenses(volume)

            self.stdout.write('Generating sales...')
            self.generate_sales(volume)

            self.stdout.write('Generating inventory adjustments...')
            self.generate_inventory_adjustments()

            self.stdout.write('Generating maintenance data...')
            self.generate_maintenance_data()

            self.stdout.write(self.style.SUCCESS('Sample data generation complete.'))

    def reset_data(self):
        Attendance.objects.all().delete()
        EmployeeProfile.objects.all().delete()
        User.objects.exclude(is_superuser=True).delete()
        # Delete sales and sale items first to avoid protected error
        from sales.models import Sale, SaleItem
        SaleItem.objects.all().delete()
        Sale.objects.all().delete()
        # Then delete inventory and related
        Inventory.objects.all().delete()
        Buyer.objects.all().delete()
        Expense.objects.all().delete()
        ExpenseCategory.objects.all().delete()
        CompanySettings.objects.all().delete()

    def generate_employees(self, volume):
        departments = ['Harvester', 'Operator', 'Driver', 'Admin']
        for i in range(1, volume + 1):
            EmployeeProfile.objects.update_or_create(
                employee_id=str(100 + i),
                defaults={
                    'full_name': f'Employee {i}',
                    'photo': '',
                    'department': departments[i % len(departments)],
                    'position': 'Worker',
                    'date_joined': '2025-03-01',
                    'is_active': True,
                    'track_shifts': False,
                    'department_track_shifts': False,
                }
            )

    def generate_attendance(self, volume):
        employees = list(EmployeeProfile.objects.all())
        for emp in employees:
            for day_offset in range(5):  # 5 days of logs
                check_in_time = datetime(2025, 4, 1, 8, 0) - timedelta(days=day_offset)
                check_out_time = check_in_time + timedelta(hours=8)
                Attendance.objects.update_or_create(
                    employee_id=emp.employee_id,
                    check_in=check_in_time.strftime('%Y-%m-%d %H:%M'),
                    defaults={
                        'employee_name': emp.full_name,
                        'check_out': check_out_time.strftime('%Y-%m-%d %H:%M'),
                        'department': emp.department,
                        'import_date': datetime.now().isoformat(),
                    }
                )

    def generate_company_settings(self):
        CompanySettings.objects.update_or_create(
            id=1,
            defaults={
                'company_name': 'Sample Ice Plant Corp.',
                'company_address_line1': '123 Ice Street',
                'company_city': 'Cool City',
                'company_state': 'Metro',
                'company_postal_code': '12345',
                'company_country': 'Philippines',
                'phone_number': '123-456-7890',
                'alternate_phone': '098-765-4321',
                'email': 'info@sampleiceplant.com',
                'website': 'https://sampleiceplant.com',
                'tax_id': 'TAX-123456',
                'business_registration': 'BR-78910',
                'tax_percentage': 12.0,
                'tax_enabled': True
            }
        )

    def generate_inventory(self, volume):
        items = [
            # Ice Plant
            ('Ice Block (150kg)', 'blocks', 200, 20),
            ('Salt (NaCl)', 'sacks', 50, 5),
            ('Ammonia Refrigerant', 'tanks', 10, 2),
            ('Plastic Packaging', 'rolls', 100, 10),
            # Metal Forming
            ('Steel Sheets 4x8', 'sheets', 300, 50),
            ('Welding Rods', 'boxes', 100, 5),
            ('Cutting Discs', 'pieces', 200, 20),
            ('Bolts and Nuts', 'sets', 500, 100),
            ('Paint (1L)', 'cans', 50, 10),
            ('Steel Bars', 'pieces', 150, 20),
            ('Angle Bars', 'pieces', 100, 15),
            ('Metal Plates', 'sheets', 80, 10),
        ]
        for name, unit, qty, min_level in items:
            Inventory.objects.update_or_create(
                item_name=name,
                defaults={
                    'quantity': qty,
                    'unit': unit,
                    'minimum_level': min_level
                }
            )

    def generate_users(self):
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@example.com', 'adminpass')
        User.objects.get_or_create(username='staff1', defaults={'email': 'staff1@example.com', 'is_staff': True})
        User.objects.get_or_create(username='staff2', defaults={'email': 'staff2@example.com', 'is_staff': True})

    def generate_buyers(self, volume):
        buyers_data = [
            # Seafood Traders
            ('Gensan Fresh Seafood Trading', 'Ramon Cruz', '09171234567', 'Lagao, General Santos City', 'Seafood Trading'),
            ('Davao Tuna Exporters', 'Liza Navarro', '09181234567', 'Calumpang, General Santos City', 'Seafood Export'),
            ('Mindanao Fish Dealers', 'Edgar Flores', '09192223333', 'Bula, General Santos City', 'Fish Wholesale'),
            # Ice Resellers
            ('Cool Blocks General Santos', 'Ana Bautista', '09221234567', 'San Isidro, General Santos City', 'Ice Resale'),
            ('Ice King Distributors', 'Carlo Mendoza', '09331234567', 'City Heights, General Santos City', 'Ice Distribution'),
            # Fabrication Clients
            ('MetalWorks Gensan', 'Marvin Santos', '09441234567', 'Tambler, General Santos City', 'Metal Fabrication'),
            ('Southern Steel Fabricators', 'Jenny Reyes', '09551234567', 'Apopong, General Santos City', 'Steel Fabrication'),
            # Hardware Buyers
            ('Davao Steel Supply', 'Leo Cruz', '09661234567', 'Lagao, General Santos City', 'Hardware Supply'),
            ('Mindanao Construction Depot', 'Grace Dela Cruz', '09771234567', 'Calumpang, General Santos City', 'Construction Materials'),
        ]

        for idx, (company, contact_person, phone, address, business_type) in enumerate(buyers_data, 1):
            Buyer.objects.update_or_create(
                name=company,
                defaults={
                    'email': f'{contact_person.lower().replace(" ", ".")}@{company.lower().replace(" ", "")}.ph',
                    'phone': phone,
                    'address': address,
                    'city': 'General Santos City',
                    'state': 'South Cotabato',
                    'postal_code': f'9500',
                    'company_name': company,
                    'tax_id': f'TAX-{1000 + idx}',
                    'business_type': business_type,
                    'is_active': True,
                    'notes': f'{business_type} client located in {address}, contact person: {contact_person}'
                }
            )

    def generate_expenses(self, volume):
        categories = ['Taxes', 'Utilities', 'Payroll', 'Supplies', 'Maintenance', 'Raw Materials']
        for cat in categories:
            ExpenseCategory.objects.get_or_create(name=cat)

        users = list(User.objects.filter(is_staff=True))
        if not users:
            users = [User.objects.filter(is_superuser=True).first()]

        for i in range(1, volume + 1):
            category_obj = ExpenseCategory.objects.order_by('?').first()
            Expense.objects.update_or_create(
                description=f'Expense {i}',
                defaults={
                    'purchase_date': '2025-04-01',
                    'vendor': f'Vendor {i}',
                    'date': '2025-04-01',
                    'payee': f'Payee {i}',
                    'amount': round(random.uniform(100, 1000), 2),
                    'category': 'miscellaneous',
                    'category_object': category_obj,
                    'reference_number': f'REF-{i}',
                    'payment_method': 'cash' if i % 2 == 0 else 'bank_transfer',
                    'ice_plant_allocation': round(random.uniform(50, 500), 2),
                    'notes': f'Notes for expense {i}',
                    'created_by': random.choice(users),
                    'approved': bool(i % 2),
                    'approved_by': random.choice(users),
                    'approved_date': timezone.now(),
                }
            )
    def generate_inventory_adjustments(self):
        from inventory.models import Inventory, InventoryAdjustment

        inventories = list(Inventory.objects.all())
        users = list(User.objects.filter(is_staff=True))
        if not users:
            users = [User.objects.filter(is_superuser=True).first()]

        for inv in inventories:
            previous_qty = inv.quantity
            adjustment_amount = random.randint(-10, 10)
            new_qty = max(0, previous_qty + adjustment_amount)
            InventoryAdjustment.objects.create(
                inventory=inv,
                previous_quantity=previous_qty,
                new_quantity=new_qty,
                adjustment_amount=adjustment_amount,
                adjustment_date=timezone.now(),
                reason='Stock correction',
                adjusted_by=random.choice(users).username
            )
            inv.quantity = new_qty
            inv.save()

    def generate_maintenance_data(self):
        from maintenance.models import MaintenanceItem, MaintenanceRecord

        equipment_types = ['Compressor', 'Condenser', 'Pump', 'Freezer']
        locations = ['Plant A', 'Plant B', 'Warehouse']

        # Create maintenance items
        items = []
        for i in range(5):
            item = MaintenanceItem.objects.create(
                equipment_name=f'Equipment {i+1}',
                equipment_type=random.choice(equipment_types),
                model_number=f'MODEL-{i+1}',
                serial_number=f'SERIAL-{i+1}',
                location=random.choice(locations),
                installation_date=timezone.datetime(2023, 1, 1).date(),
                maintenance_frequency=random.choice([1, 3, 6]),
                frequency_unit='months',
                next_maintenance_date=timezone.datetime(2025, 5, 1).date(),
                status='operational',
                notes='Auto-generated equipment'
            )
            items.append(item)

        # Create maintenance records
        for item in items:
            MaintenanceRecord.objects.create(
                maintenance_item=item,
                maintenance_date=timezone.datetime(2025, 4, 1).date(),
                maintenance_type='scheduled',
                performed_by='Technician A',
                cost=round(random.uniform(100, 1000), 2),
                parts_replaced='Filter, Oil',
                duration=2.5,
                issues_found='None',
                actions_taken='Routine check',
                recommendations='Next check in 3 months',
                status='completed'
            )

    def generate_sales(self, volume):
        from sales.models import SaleItem

        buyers = list(Buyer.objects.all())
        inventory_items = list(Inventory.objects.all())

        for i in range(1, volume + 1):
            buyer = buyers[i % len(buyers)]
            sale_obj, _ = Sale.objects.update_or_create(
                si_number=f'SI-{1000 + i}',
                defaults={
                    'buyer': buyer,
                    'buyer_name': buyer.name,
                    'buyer_contact': buyer.phone,
                    'sale_date': '2025-04-01',
                    'sale_time': '10:00',
                    'status': 'processed',
                    'po_number': f'PO-{i}',
                    'is_iceplant': True,
                    'pickup_quantity': random.randint(1, 20),
                    'delivery_quantity': random.randint(1, 20),
                    'brine1_identifier': f'BR1-{i}',
                    'brine2_identifier': f'BR2-{i}',
                    'price_per_block': round(random.uniform(50, 100), 2),
                }
            )
            # Create 1-3 sale items per sale
            for _ in range(random.randint(1, 3)):
                item = random.choice(inventory_items)
                quantity = random.randint(1, 10)
                unit_price = round(random.uniform(50, 100), 2)
                SaleItem.objects.create(
                    sale=sale_obj,
                    inventory_item=item,
                    quantity=quantity,
                    unit_price=unit_price,
                    total_price=quantity * unit_price
                )