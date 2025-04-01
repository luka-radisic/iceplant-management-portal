import random
from datetime import datetime, timedelta
from decimal import Decimal
import uuid
import pytz  # Add import for pytz

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone

from sales.models import Sale
from buyers.models import Buyer
from inventory.models import Inventory, InventoryAdjustment
from expenses.models import Expense, ExpenseCategory


class Command(BaseCommand):
    help = 'Generate test data for sales, buyers, inventory, and expenses'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Starting to generate test data...'))
        
        # Get or create admin user for approvals
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'is_staff': True,
                'is_superuser': True,
                'email': 'admin@example.com'
            }
        )
        if created:
            admin_user.set_password('admin')
            admin_user.save()
            self.stdout.write(self.style.SUCCESS('Created admin user'))
        
        # Generate buyers
        self.generate_buyers()
        
        # Generate inventory items
        self.generate_inventory()
        
        # Generate expenses for last 3 months
        self.generate_expenses(admin_user)
        
        # Generate sales for last 3 months
        self.generate_sales()
        
        self.stdout.write(self.style.SUCCESS('Test data generation completed successfully!'))

    def generate_buyers(self):
        """Generate test buyers"""
        self.stdout.write('Generating buyers...')
        
        # List of fictional businesses and individuals
        buyers_data = [
            {'name': 'Manila Ice Supply Co.', 'business_type': 'Distributor', 'city': 'Manila'},
            {'name': 'Quezon Cold Storage', 'business_type': 'Storage', 'city': 'Quezon City'},
            {'name': 'Cebu Seafood Market', 'business_type': 'Retail', 'city': 'Cebu'},
            {'name': 'Davao Fresh Catch', 'business_type': 'Fishing', 'city': 'Davao'},
            {'name': 'Pampanga Food Processing', 'business_type': 'Manufacturing', 'city': 'San Fernando'},
            {'name': 'Batangas Port Services', 'business_type': 'Shipping', 'city': 'Batangas'},
            {'name': 'Iloilo Fish Traders', 'business_type': 'Wholesale', 'city': 'Iloilo'},
            {'name': 'Zambales Resort Group', 'business_type': 'Hospitality', 'city': 'Olongapo'},
            {'name': 'Filipino Restaurant Chain', 'business_type': 'Food Service', 'city': 'Makati'},
            {'name': 'Northern Luzon Events', 'business_type': 'Events', 'city': 'Baguio'},
            {'name': 'Juan Santos', 'business_type': 'Individual', 'city': 'Cavite'},
            {'name': 'Maria Garcia', 'business_type': 'Individual', 'city': 'Laguna'},
            {'name': 'Pedro Reyes', 'business_type': 'Individual', 'city': 'Taguig'},
            {'name': 'Sofia Cruz', 'business_type': 'Individual', 'city': 'Parañaque'}
        ]
        
        buyers_created = 0
        for data in buyers_data:
            # Check if buyer already exists
            if not Buyer.objects.filter(name=data['name']).exists():
                Buyer.objects.create(
                    id=uuid.uuid4(),
                    name=data['name'],
                    company_name=data['name'] if data['business_type'] != 'Individual' else None,
                    business_type=data['business_type'],
                    city=data['city'],
                    phone=f'+63{random.randint(900, 999)}{random.randint(1000000, 9999999)}',
                    email=f"{data['name'].lower().replace(' ', '')}@example.com" if random.random() > 0.3 else None,
                    is_active=True
                )
                buyers_created += 1
        
        self.stdout.write(self.style.SUCCESS(f'Created {buyers_created} buyers'))
        return Buyer.objects.all()

    def generate_inventory(self):
        """Generate test inventory items and adjustments"""
        self.stdout.write('Generating inventory items...')
        
        # List of inventory items with initial quantities
        inventory_data = [
            {'name': 'Ice Blocks - Regular', 'quantity': 500, 'unit': 'blocks', 'min_level': 100},
            {'name': 'Ice Blocks - Large', 'quantity': 250, 'unit': 'blocks', 'min_level': 50},
            {'name': 'Ice Crushed - 50kg Bag', 'quantity': 100, 'unit': 'bags', 'min_level': 20},
            {'name': 'Ice Tubes - 10kg Pack', 'quantity': 150, 'unit': 'packs', 'min_level': 30},
            {'name': 'Salt - Industrial', 'quantity': 1000, 'unit': 'kg', 'min_level': 200},
            {'name': 'Ammonia', 'quantity': 500, 'unit': 'liters', 'min_level': 100},
            {'name': 'Packaging Material', 'quantity': 2000, 'unit': 'pieces', 'min_level': 300},
            {'name': 'Spare Parts - Compressor', 'quantity': 15, 'unit': 'units', 'min_level': 5},
            {'name': 'Spare Parts - Pumps', 'quantity': 25, 'unit': 'units', 'min_level': 8},
            {'name': 'Spare Parts - Motors', 'quantity': 10, 'unit': 'units', 'min_level': 3},
            {'name': 'Lubricant Oil', 'quantity': 200, 'unit': 'liters', 'min_level': 50},
            {'name': 'Safety Equipment', 'quantity': 30, 'unit': 'sets', 'min_level': 10}
        ]
        
        items_created = 0
        adjustments_created = 0
        
        # Create inventory items
        for data in inventory_data:
            item, created = Inventory.objects.get_or_create(
                item_name=data['name'],
                defaults={
                    'quantity': data['quantity'],
                    'unit': data['unit'],
                    'minimum_level': data['min_level']
                }
            )
            
            if created:
                items_created += 1
                
                # Generate random inventory adjustments over last 3 months
                today = timezone.now().date()
                for _ in range(random.randint(5, 15)):
                    adjustment_date = today - timedelta(days=random.randint(1, 90))
                    adjustment_amount = random.randint(-50, 100)
                    previous_quantity = item.quantity - adjustment_amount
                    
                    # Ensure no negative quantities
                    if previous_quantity < 0:
                        previous_quantity = 0
                        adjustment_amount = item.quantity
                    
                    InventoryAdjustment.objects.create(
                        inventory=item,
                        previous_quantity=previous_quantity,
                        new_quantity=previous_quantity + adjustment_amount,
                        adjustment_amount=adjustment_amount,
                        adjustment_date=datetime.combine(adjustment_date, datetime.min.time()).replace(tzinfo=pytz.UTC),  # Use pytz.UTC instead of timezone.utc
                        reason=random.choice([
                            'Restocking',
                            'Stock count adjustment',
                            'Damaged goods',
                            'Production usage',
                            'Sale deduction',
                            'Supplier delivery',
                            'Quality control rejection',
                            'Expired items removed'
                        ]),
                        adjusted_by=random.choice(['Admin', 'Inventory Manager', 'Warehouse Staff', 'Production Supervisor'])
                    )
                    adjustments_created += 1
        
        self.stdout.write(self.style.SUCCESS(f'Created {items_created} inventory items with {adjustments_created} adjustments'))

    def generate_expenses(self, admin_user):
        """Generate test expenses for the last 3 months"""
        self.stdout.write('Generating expenses...')
        
        # Create expense categories if they don't exist
        categories = []
        for category_choice in Expense.CATEGORY_CHOICES:
            category, created = ExpenseCategory.objects.get_or_create(
                name=category_choice[1],
                defaults={'description': f'Expenses related to {category_choice[1].lower()}'}
            )
            categories.append(category)
            
        # List of common payees
        payees = [
            'Meralco', 'Manila Water', 'Globe Telecom', 'PLDT', 'Shell Gas Station',
            'Metro Oil Company', 'National Hardware', 'Ace Hardware', 'SM Supermarket',
            'Mercury Drug', 'Juan Dela Cruz (Driver)', 'Maria Santos (Staff)',
            'Department of Labor', 'BIR', 'SSS', 'Pag-IBIG', 'PhilHealth',
            'ABC Equipment Supplies', 'XYZ Maintenance Services', 'Local City Hall',
            'Provincial Treasurer', 'Logistics Partner Inc.', 'Employee Payroll',
            'Security Agency', 'Cleaning Services Inc.'
        ]
        
        # Start from 3 months ago until today
        today = timezone.now().date()
        start_date = today - timedelta(days=90)
        
        expenses_created = 0
        current_date = start_date
        
        while current_date <= today:
            # Number of expenses for this day (0-5)
            num_expenses = random.randint(0, 5)
            
            for _ in range(num_expenses):
                category = random.choice(categories)
                amount = Decimal(str(random.uniform(100.0, 50000.0))).quantize(Decimal('0.01'))
                
                # 70% of expenses are approved
                approved = random.random() < 0.7
                
                expense = Expense.objects.create(
                    date=current_date,
                    payee=random.choice(payees),
                    description=f"{category.name} expense for {current_date.strftime('%B %Y')}",
                    amount=amount,
                    category=random.choice([c[0] for c in Expense.CATEGORY_CHOICES]),
                    category_object=category,
                    payment_method=random.choice([m[0] for m in Expense.PAYMENT_METHODS]),
                    reference_number=f"REF-{random.randint(10000, 99999)}",
                    ice_plant_allocation=amount if random.random() < 0.8 else amount * Decimal(random.uniform(0.5, 0.9)).quantize(Decimal('0.01')),
                    notes=f"Test expense for {category.name}" if random.random() < 0.5 else None,
                    created_by=admin_user,
                    approved=approved
                )
                
                if approved:
                    expense.approved_by = admin_user
                    expense.approved_date = timezone.now()
                    expense.save()
                
                expenses_created += 1
            
            current_date += timedelta(days=1)
        
        self.stdout.write(self.style.SUCCESS(f'Created {expenses_created} expenses'))

    def generate_sales(self):
        """Generate test sales for the last 3 months"""
        self.stdout.write('Generating sales...')
        
        # Get all buyers
        buyers = list(Buyer.objects.all())
        if not buyers:
            self.stdout.write(self.style.WARNING('No buyers found, skipping sales generation'))
            return
        
        # Start from 3 months ago until today
        today = timezone.now().date()
        start_date = today - timedelta(days=90)
        
        sales_created = 0
        current_date = start_date
        
        # Average ice block prices
        prices = {
            'regular': Decimal('65.00'),
            'large': Decimal('85.00')
        }
        
        while current_date <= today:
            # Number of sales for this day (3-15)
            num_sales = random.randint(3, 15)
            
            for i in range(num_sales):
                # Random time between 6am and 6pm
                hour = random.randint(6, 18)
                minute = random.randint(0, 59)
                sale_time = timezone.now().replace(hour=hour, minute=minute).time()
                
                # Random buyer
                buyer = random.choice(buyers)
                
                # Randomly choose between pickup and delivery
                pickup = random.random() < 0.7  # 70% chance of pickup
                
                # Quantities
                pickup_quantity = random.randint(10, 100) if pickup else 0
                delivery_quantity = random.randint(10, 200) if not pickup else 0
                
                # Price based on volume
                total_quantity = pickup_quantity + delivery_quantity
                price_per_block = prices['regular']
                if total_quantity > 100:
                    # Bulk discount
                    price_per_block = price_per_block * Decimal('0.95')
                
                # Payment - randomly choose between cash, PO, or split
                payment_type = random.choice(['cash', 'po', 'split'])
                total_cost = total_quantity * price_per_block
                
                if payment_type == 'cash':
                    cash_amount = total_cost
                    po_amount = Decimal('0.00')
                elif payment_type == 'po':
                    cash_amount = Decimal('0.00')
                    po_amount = total_cost
                else:  # split
                    cash_percent = Decimal(str(random.uniform(0.3, 0.7))).quantize(Decimal('0.01'))
                    cash_amount = (total_cost * cash_percent).quantize(Decimal('0.01'))
                    po_amount = (total_cost - cash_amount).quantize(Decimal('0.01'))
                
                # Create the sale
                Sale.objects.create(
                    si_number=f"SI-{current_date.strftime('%Y%m%d')}-{i+1:03d}",
                    sale_date=current_date,
                    sale_time=sale_time,
                    status='processed',
                    buyer=buyer,
                    buyer_name=buyer.name,
                    buyer_contact=buyer.phone,
                    po_number=f"PO-{random.randint(10000, 99999)}" if po_amount > 0 else None,
                    pickup_quantity=pickup_quantity,
                    delivery_quantity=delivery_quantity,
                    brine1_identifier=f"B1-{random.randint(100, 999)}" if random.random() < 0.5 else None,
                    brine2_identifier=f"B2-{random.randint(100, 999)}" if random.random() < 0.5 else None,
                    price_per_block=price_per_block,
                    cash_amount=cash_amount,
                    po_amount=po_amount,
                    notes=random.choice([
                        "Regular customer order",
                        "Rush delivery",
                        "Special pricing approved",
                        "Volume discount applied",
                        "Returning customer",
                        None, None, None  # Higher chance of no notes
                    ])
                )
                
                sales_created += 1
            
            current_date += timedelta(days=1)
        
        self.stdout.write(self.style.SUCCESS(f'Created {sales_created} sales')) 