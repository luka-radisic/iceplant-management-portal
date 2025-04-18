from django.contrib import admin
from .models import Sale

@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = (
        'si_number', 
        'buyer_name',
        'buyer',
        'sale_date', 
        'sale_time', 
        'total_quantity',
        'price_per_block',
        'total_cost',
        'total_payment',
        'payment_status',
        'status'
    )
    list_filter = ('sale_date', 'buyer_name', 'status', 'buyer')
    search_fields = ('si_number', 'buyer_name', 'po_number', 'notes', 'buyer__name', 'buyer__company_name')
    date_hierarchy = 'sale_date'
    readonly_fields = ('created_at', 'updated_at', 'total_quantity', 'total_cost', 'total_payment', 'payment_status')
    autocomplete_fields = ['buyer']
