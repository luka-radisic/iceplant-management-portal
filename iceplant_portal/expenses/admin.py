from django.contrib import admin
from .models import Expense

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('description', 'amount', 'category', 'vendor', 'purchase_date')
    list_filter = ('category', 'purchase_date')
    search_fields = ('description', 'vendor', 'notes')
    date_hierarchy = 'purchase_date'
    readonly_fields = ('created_at', 'updated_at')
