from django.contrib import admin
from .models import Buyer

@admin.register(Buyer)
class BuyerAdmin(admin.ModelAdmin):
    list_display = ('name', 'company_name', 'phone', 'email', 'created_at', 'is_active')
    list_filter = ('is_active', 'created_at', 'business_type')
    search_fields = ('name', 'company_name', 'email', 'phone')
    date_hierarchy = 'created_at'
    readonly_fields = ('id', 'created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'name', 'email', 'phone')
        }),
        ('Address', {
            'fields': ('address', 'city', 'state', 'postal_code')
        }),
        ('Business Details', {
            'fields': ('company_name', 'tax_id', 'business_type')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'is_active', 'notes')
        }),
    )
