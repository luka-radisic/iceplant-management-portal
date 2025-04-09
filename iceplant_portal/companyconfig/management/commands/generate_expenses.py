import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from expenses.models import ExpenseCategory, Expense
from users.models import User

CATEGORIES = [
    ("Utilities", "Electricity, Water, Internet"),
    ("Payroll", "Employee salaries and wages"),
    ("Supplies", "Office and production supplies"),
    ("Repairs & Maintenance", "Equipment and facility repairs"),
    ("Taxes & Licenses", "Government fees and taxes"),
]

PAYEES = [
    "SOCOTECO II", "General Santos City Hall", "Ana Bautista", "Carlo Mendoza",
    "Hardware Depot", "Davao Steel Supply", "Mindanao Construction Depot"
]

PAYMENT_METHODS = ["Cash", "Check", "Bank Transfer", "GCash"]

def random_date():
    start = timezone.datetime(2025, 1, 1, tzinfo=timezone.get_current_timezone())
    end = timezone.now()
    return start + (end - start) * random.random()

class Command(BaseCommand):
    help = 'Generate realistic Filipino expenses data'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Delete existing expenses before generating')
        parser.add_argument('--volume', type=int, default=50, help='Number of expenses to generate')

    def handle(self, *args, **options):
        if options['reset']:
            Expense.objects.all().delete()
            ExpenseCategory.objects.all().delete()
            self.stdout.write(self.style.WARNING('Existing expenses and categories deleted.'))

        # Create categories
        category_objs = []
        for name, desc in CATEGORIES:
            cat, _ = ExpenseCategory.objects.get_or_create(name=name, defaults={'description': desc})
            category_objs.append(cat)

        # Get any user for created_by and approved_by
        user = User.objects.filter(is_superuser=True).first() or User.objects.first()

        volume = options['volume']
        for _ in range(volume):
            category = random.choice(category_objs)
            payee = random.choice(PAYEES)
            amount = random.randint(500, 100000)
            date = random_date().date()
            payment_method = random.choice(PAYMENT_METHODS)
            description = f"{category.name} payment to {payee}"

            Expense.objects.create(
                category=category.name,
                category_object=category,
                payee=payee,
                amount=amount,
                date=date,
                purchase_date=date,
                vendor=f"Vendor {random.randint(1, 20)}",
                payment_method=payment_method,
                description=description,
                reference_number=f"REF-{random.randint(1000,9999)}",
                ice_plant_allocation=round(random.uniform(50, 500), 2),
                notes=f"Notes for expense {description}",
                receipt='',
                created_at=timezone.now(),
                updated_at=timezone.now(),
                created_by=user,
                approved=True,
                approved_by=user,
                approved_date=timezone.now(),
            )

        self.stdout.write(self.style.SUCCESS(f'{volume} expenses generated successfully.'))