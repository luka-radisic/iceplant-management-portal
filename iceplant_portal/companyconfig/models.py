from django.db import models

def company_logo_upload_path(instance, filename):
    # Generate a path for the logo uploads
    ext = filename.split('.')[-1]
    return f'company_logos/logo.{ext}'

class CompanySettings(models.Model):
    """
    Model to store company information and settings
    Only one instance of this model should exist
    """
    # Company Information
    company_name = models.CharField(max_length=200, default="Ice Plant")
    company_address_line1 = models.CharField(max_length=200, blank=True, null=True)
    company_address_line2 = models.CharField(max_length=200, blank=True, null=True)
    company_city = models.CharField(max_length=100, blank=True, null=True)
    company_state = models.CharField(max_length=100, blank=True, null=True)
    company_postal_code = models.CharField(max_length=20, blank=True, null=True)
    company_country = models.CharField(max_length=100, default="Philippines")
    
    # Contact Information
    phone_number = models.CharField(max_length=50, blank=True, null=True)
    alternate_phone = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    
    # Tax/Business Information
    tax_id = models.CharField(max_length=100, blank=True, null=True, help_text="Company Tax ID/VAT Number")
    business_registration = models.CharField(max_length=100, blank=True, null=True)
    
    # Industry-specific fields
    ice_block_weight = models.DecimalField(
        max_digits=6, 
        decimal_places=2, 
        default=100.00,
        help_text="Default weight of a single ice block in kg"
    )
    production_capacity = models.IntegerField(
        default=1000,
        help_text="Production capacity in blocks per day"
    )
    
    # Logo and branding
    company_logo = models.ImageField(
        upload_to=company_logo_upload_path,
        blank=True, 
        null=True,
        help_text="Company logo for UI and printed documents"
    )
    
    # Footer text for invoices/receipts
    invoice_footer_text = models.TextField(
        blank=True, 
        null=True,
        help_text="Text to appear at the bottom of invoices"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Company Settings"
        verbose_name_plural = "Company Settings"
    
    def __str__(self):
        return self.company_name
    
    @classmethod
    def get_settings(cls):
        """
        Returns the company settings instance, creating one if it doesn't exist
        """
        settings, created = cls.objects.get_or_create(pk=1)
        return settings
