from django.contrib import admin
from .models import Sale

@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ('buyer_name', 'quantity', 'brine_level', 'sale_date', 'payment_method', 'delivery_method')
    list_filter = ('payment_method', 'delivery_method', 'brine_level')
    search_fields = ('buyer_name', 'po_number', 'notes')
    date_hierarchy = 'sale_date'
    readonly_fields = ('created_at', 'updated_at')
