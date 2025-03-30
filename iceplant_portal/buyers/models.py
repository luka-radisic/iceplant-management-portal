from django.db import models
import uuid

class Buyer(models.Model):
    """
    Model representing a buyer/customer for sales.
    """
    # Unique identifier for the buyer
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Basic information
    name = models.CharField(max_length=255, db_index=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    
    # Address information
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    
    # Business information
    company_name = models.CharField(max_length=255, blank=True, null=True)
    tax_id = models.CharField(max_length=50, blank=True, null=True)
    business_type = models.CharField(max_length=100, blank=True, null=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    # Optional notes
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = 'Buyer'
        verbose_name_plural = 'Buyers'
        
    def __str__(self):
        return self.name
