from django.contrib import admin
from .models import CompanySettings

@admin.register(CompanySettings)
class CompanySettingsAdmin(admin.ModelAdmin):
    fieldsets = (
        ('Company Information', {
            'fields': (
                'company_name', 
                'company_address_line1', 
                'company_address_line2', 
                'company_city', 
                'company_state', 
                'company_postal_code', 
                'company_country'
            )
        }),
        ('Contact Information', {
            'fields': ('phone_number', 'alternate_phone', 'email', 'website')
        }),
        ('Tax & Business Information', {
            'fields': ('tax_id', 'business_registration')
        }),
        ('Ice Plant Specific Settings', {
            'fields': ('ice_block_weight', 'production_capacity')
        }),
        ('Branding', {
            'fields': ('company_logo',)
        }),
        ('Invoices & Documentation', {
            'fields': ('invoice_footer_text',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    
    def has_add_permission(self, request):
        # Prevent creating multiple company settings instances
        # Only allow if none exist
        return not CompanySettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Prevent deleting the company settings
        return False
