from django.db import models
from django.utils import timezone
from decimal import Decimal

class Sale(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('canceled', 'Canceled'),
        ('error', 'Error/Mistake'),
    ]
    
    # Core Sale Details
    si_number = models.CharField(max_length=50, default='', help_text="Sales Invoice number")
    sale_date = models.DateField(default=timezone.now)
    sale_time = models.TimeField(default=timezone.now)
    status = models.CharField(
        max_length=10, 
        choices=STATUS_CHOICES, 
        default='active', 
        help_text="The current status of the sale record"
    )
    
    # Customer and PO
    buyer_name = models.CharField(max_length=100)
    buyer_contact = models.CharField(max_length=100, blank=True, null=True)
    po_number = models.CharField(max_length=50, blank=True, null=True)

    # Quantities
    pickup_quantity = models.IntegerField(default=0, help_text="Number of blocks picked up")
    delivery_quantity = models.IntegerField(default=0, help_text="Number of blocks delivered")
    
    # Brine Identifiers
    brine1_identifier = models.CharField(max_length=100, blank=True, null=True, help_text="Identifier for blocks from Brine 1")
    brine2_identifier = models.CharField(max_length=100, blank=True, null=True, help_text="Identifier for blocks from Brine 2")
    
    # Pricing and Payment
    price_per_block = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), help_text="Price per ice block")
    cash_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), help_text="Amount paid in cash")
    po_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), help_text="Amount covered by Purchase Order")
    
    # Notes/Remarks
    notes = models.TextField(blank=True, null=True, help_text="Remarks or other notes")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-sale_date', '-sale_time']
        verbose_name = 'Sale'
        verbose_name_plural = 'Sales'
    
    def __str__(self):
        return f"SI {self.si_number} - {self.buyer_name} - {self.sale_date}"
    
    @property
    def total_quantity(self):
        # Ensure quantities are treated as 0 if None
        pickup = self.pickup_quantity or 0
        delivery = self.delivery_quantity or 0
        return pickup + delivery
        
    @property
    def total_cost(self):
        # Ensure price is Decimal(0) if None before multiplying
        price = Decimal(self.price_per_block or 0)
        total_qty = self.total_quantity # Already handles None
        cost = (total_qty * price)
        return cost.quantize(Decimal('0.01'))

    @property
    def total_payment(self):
        # Ensure amounts are Decimal(0) if None before adding
        cash = Decimal(self.cash_amount or 0)
        po = Decimal(self.po_amount or 0)
        payment = (cash + po)
        return payment.quantize(Decimal('0.01'))

    @property
    def payment_status(self):
        # Rely on the already-safe properties
        total_cost = self.total_cost
        total_payment = self.total_payment
        
        # Explicitly compare Decimal values
        if total_payment >= total_cost:
            return "Paid"
        elif total_payment > Decimal(0):
            return "Partially Paid"
        else:
            return "Unpaid"
