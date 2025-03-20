from django.db import models
from django.utils import timezone

class Sale(models.Model):
    PAYMENT_CHOICES = [
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
    ]
    
    DELIVERY_CHOICES = [
        ('pickup', 'Pickup'),
        ('delivery', 'Delivery'),
    ]
    
    quantity = models.IntegerField(help_text="Ice block quantity (100 kg units)")
    brine_level = models.IntegerField(choices=[(1, 'Level 1'), (2, 'Level 2')])
    sale_date = models.DateTimeField(default=timezone.now)
    buyer_name = models.CharField(max_length=100)
    buyer_contact = models.CharField(max_length=100, blank=True, null=True)
    po_number = models.CharField(max_length=50, blank=True, null=True)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default='cash')
    delivery_method = models.CharField(max_length=20, choices=DELIVERY_CHOICES, default='pickup')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-sale_date']
        verbose_name = 'Sale'
        verbose_name_plural = 'Sales'
    
    def __str__(self):
        return f"{self.buyer_name} - {self.quantity} blocks - {self.sale_date.date()}"
    
    @property
    def total_weight(self):
        """Calculate total weight in kg"""
        return self.quantity * 100
