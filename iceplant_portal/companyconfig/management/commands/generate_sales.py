import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from sales.models import Sale, SaleItem
from buyers.models import Buyer
from inventory.models import Inventory

STATUSES = ["Completed", "Pending", "Cancelled"]

def random_date():
    start = timezone.datetime(2025, 1, 1, tzinfo=timezone.get_current_timezone())
    end = timezone.now()
    return start + (end - start) * random.random()

class Command(BaseCommand):
    help = 'Generate realistic Filipino sales data with sale items'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Delete existing sales before generating')
        parser.add_argument('--volume', type=int, default=50, help='Number of sales to generate')

    def handle(self, *args, **options):
        if options['reset']:
            SaleItem.objects.all().delete()
            Sale.objects.all().delete()
            self.stdout.write(self.style.WARNING('Existing sales and sale items deleted.'))

        buyers = list(Buyer.objects.all())
        inventory_items = list(Inventory.objects.all())

        if not buyers or not inventory_items:
            self.stdout.write(self.style.ERROR('Buyers and inventory must exist before generating sales.'))
            return

        volume = options['volume']
        for i in range(volume):
            si_number = f"SI-2025-{i+1:04d}"
            sale_date = random_date().date()
            sale_time = random_date().time().replace(second=0, microsecond=0)
            status = random.choice(STATUSES)
            buyer = random.choice(buyers)
            brine1 = f"BrineTank-{random.randint(1,3)}"
            brine2 = f"BrineTank-{random.randint(4,6)}"
            pickup_qty = random.randint(0, 100)
            delivery_qty = random.randint(0, 100)
            price_per_block = 150

            sale = Sale.objects.create(
                si_number=si_number,
                sale_date=sale_date,
                sale_time=sale_time,
                status=status,
                buyer=buyer,
                buyer_name=buyer.name,
                buyer_contact=buyer.phone,
                po_number=f"PO-{random.randint(1000,9999)}",
                is_iceplant=True,
                pickup_quantity=pickup_qty,
                delivery_quantity=delivery_qty,
                brine1_identifier=brine1,
                brine2_identifier=brine2,
                price_per_block=price_per_block,
                cash_amount=round(random.uniform(100, 1000), 2),
                po_amount=round(random.uniform(100, 1000), 2),
                notes=f"Sale notes {i+1}",
                created_at=timezone.now(),
                updated_at=timezone.now(),
            )

            num_items = random.randint(1, 3)
            for _ in range(num_items):
                item = random.choice(inventory_items)
                quantity = random.randint(1, 20)
                unit_price = random.randint(100, 1500)
                total_price = quantity * unit_price

                SaleItem.objects.create(
                    sale=sale,
                    inventory_item=item,
                    quantity=quantity,
                    unit_price=unit_price,
                    total_price=total_price,
                )

        self.stdout.write(self.style.SUCCESS(f'{volume} sales with sale items generated successfully.'))