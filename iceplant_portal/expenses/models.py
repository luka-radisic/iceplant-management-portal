from django.db import models
from django.utils import timezone

class ExpenseCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Expense Category'
        verbose_name_plural = 'Expense Categories'
        ordering = ['name']
    
    def __str__(self):
        return self.name

class Expense(models.Model):
    CATEGORY_CHOICES = [
        ('meals', 'Meals'),
        ('utilities', 'Utilities'),
        ('maintenance', 'Maintenance'),
        ('salaries', 'Salaries'),
        ('payroll', 'Payroll'),
        ('raw_materials', 'Raw Materials'),
        ('equipment', 'Equipment'),
        ('transportation', 'Transportation'),
        ('taxes', 'Taxes'),
        ('permits', 'Permits & Licenses'),
        ('electricity', 'Electricity'),
        ('bonus', 'Bonus'),
        ('ice_delivery', 'Ice Delivery'),
        ('ice_plant', 'Ice Plant'),
        ('miscellaneous', 'Miscellaneous'),
    ]
    
    PAYMENT_METHODS = [
        ('cash', 'Cash'),
        ('check', 'Check'),
        ('bank_transfer', 'Bank Transfer'),
        ('credit_card', 'Credit Card'),
        ('debit_card', 'Debit Card'),
        ('mobile_payment', 'Mobile Payment'),
        ('other', 'Other'),
    ]
    
    # Keeping purchase_date for backward compatibility during migration
    purchase_date = models.DateField(default=timezone.now)
    # Keeping vendor for backward compatibility during migration
    vendor = models.CharField(max_length=100, blank=True, default='')
    
    # New fields with defaults for migration
    date = models.DateField(default=timezone.now)
    payee = models.CharField(max_length=200, default='')
    description = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='miscellaneous')
    category_object = models.ForeignKey(ExpenseCategory, on_delete=models.SET_NULL, blank=True, null=True, related_name='expenses')
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    payment_method = models.CharField(max_length=50, choices=PAYMENT_METHODS, default='cash')
    ice_plant_allocation = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True, null=True)
    receipt = models.FileField(upload_to='receipts/%Y/%m/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, related_name='created_expenses')
    approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_expenses')
    approved_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-date']
        verbose_name = 'Expense'
        verbose_name_plural = 'Expenses'
    
    def __str__(self):
        return f"{self.description} - ₱{self.amount} - {self.date}"
    
    def save(self, *args, **kwargs):
        # If not explicitly set, set ice_plant_allocation to the same as amount
        if self.ice_plant_allocation == 0:
            self.ice_plant_allocation = self.amount
            
        # For backward compatibility during migration
        if not self.date:
            self.date = self.purchase_date
        if not self.payee and self.vendor:
            self.payee = self.vendor
            
        super().save(*args, **kwargs)
