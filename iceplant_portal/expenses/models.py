from django.db import models
from django.utils import timezone

class Expense(models.Model):
    CATEGORY_CHOICES = [
        ('utilities', 'Utilities'),
        ('maintenance', 'Maintenance'),
        ('salaries', 'Salaries'),
        ('raw_materials', 'Raw Materials'),
        ('equipment', 'Equipment'),
        ('miscellaneous', 'Miscellaneous'),
    ]
    
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    purchase_date = models.DateField(default=timezone.now)
    vendor = models.CharField(max_length=100)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='miscellaneous')
    receipt = models.FileField(upload_to='receipts/', blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-purchase_date']
        verbose_name = 'Expense'
        verbose_name_plural = 'Expenses'
    
    def __str__(self):
        return f"{self.description} - ${self.amount} - {self.purchase_date}"
