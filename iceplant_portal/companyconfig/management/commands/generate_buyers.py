import random
from django.core.management.base import BaseCommand
from buyers.models import Buyer

BUYER_COMPANIES = [
    ("Gensan Fresh Seafood Trading", "Seafood Trading"),
    ("Davao Tuna Exporters", "Seafood Trading"),
    ("Mindanao Fish Dealers", "Seafood Trading"),
    ("Cool Blocks General Santos", "Ice Resale"),
    ("Ice King Distributors", "Ice Resale"),
    ("MetalWorks Gensan", "Fabrication"),
    ("Southern Steel Fabricators", "Fabrication"),
    ("Davao Steel Supply", "Hardware"),
    ("Mindanao Construction Depot", "Hardware"),
]

CONTACT_PERSONS = [
    "Ramon Cruz", "Liza Navarro", "Edgar Flores", "Ana Bautista", "Carlo Mendoza",
    "Nina Garcia", "Mark Villanueva", "Paolo Torres", "Grace Lim", "Leo Fernandez"
]

BARANGAYS = ["Lagao", "Calumpang", "Bula", "Dadiangas", "San Isidro", "City Heights"]

class Command(BaseCommand):
    help = 'Generate realistic Filipino buyers/customers'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Delete existing buyers before generating')
        parser.add_argument('--volume', type=int, default=30, help='Number of buyers to generate')

    def handle(self, *args, **options):
        if options['reset']:
            Buyer.objects.all().delete()
            self.stdout.write(self.style.WARNING('Existing buyers deleted.'))

        volume = options['volume']
        for i in range(volume):
            company, business_type = random.choice(BUYER_COMPANIES)
            contact_person = random.choice(CONTACT_PERSONS)
            phone = f"+63 9{random.randint(10,99)} {random.randint(100,999)} {random.randint(1000,9999)}"
            email = f"contact{i+1}@{company.replace(' ', '').lower()}.ph"
            address = f"{random.choice(BARANGAYS)}, General Santos City"
            notes = f"{business_type} client located in {address}"

            Buyer.objects.update_or_create(
                name=company,
                defaults={
                    'phone': phone,
                    'email': email,
                    'address': address,
                    'city': 'General Santos City',
                    'state': 'South Cotabato',
                    'postal_code': '9500',
                    'company_name': company,
                    'tax_id': f"TAX-{1000 + i}",
                    'business_type': business_type,
                    'is_active': True,
                    'notes': notes,
                    'created_at': timezone.now(),
                    'updated_at': timezone.now(),
                }
            )
        self.stdout.write(self.style.SUCCESS(f'{volume} buyers generated successfully.'))