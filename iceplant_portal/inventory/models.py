from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator

class Inventory(models.Model):
    item_name = models.CharField(max_length=50)
    quantity = models.IntegerField(validators=[MinValueValidator(0)])
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    unit = models.CharField(max_length=20, default='unit')
    minimum_level = models.IntegerField(default=10, help_text="Minimum inventory level before alerts")
    
    class Meta:
        verbose_name = 'Inventory Item'
        verbose_name_plural = 'Inventory Items'
        ordering = ['item_name']
    
    def __str__(self):
        return f"{self.item_name} - {self.quantity} {self.unit}"
    
    @property
    def is_low(self):
        """Check if inventory is below minimum level"""
        return self.quantity <= self.minimum_level

class InventoryAdjustment(models.Model):
    inventory = models.ForeignKey(Inventory, on_delete=models.CASCADE, related_name='adjustments')
    previous_quantity = models.IntegerField()
    new_quantity = models.IntegerField()
    adjustment_amount = models.IntegerField()
    adjustment_date = models.DateTimeField(default=timezone.now)
    reason = models.TextField()
    adjusted_by = models.CharField(max_length=100)  # Can be linked to a User model later
    
    class Meta:
        ordering = ['-adjustment_date']
    
    def __str__(self):
        return f"{self.inventory.item_name} adjusted by {self.adjustment_amount} on {self.adjustment_date.date()}"
    
    def save(self, *args, **kwargs):
        # Calculate adjustment amount if not provided
        if not self.adjustment_amount:
            self.adjustment_amount = self.new_quantity - self.previous_quantity
        super().save(*args, **kwargs)
