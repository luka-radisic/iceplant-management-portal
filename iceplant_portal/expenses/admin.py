from django.contrib import admin
from .models import Expense, ExpenseCategory

@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name', 'description')

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('date', 'payee', 'description', 'amount', 'ice_plant_allocation', 'reference_number', 'category', 'approved')
    list_filter = ('category', 'date', 'payment_method', 'approved')
    search_fields = ('description', 'payee', 'reference_number', 'notes')
    date_hierarchy = 'date'
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('date', 'payee', 'description', 'amount', 'ice_plant_allocation')
        }),
        ('Categorization', {
            'fields': ('category', 'category_object')
        }),
        ('Payment Details', {
            'fields': ('payment_method', 'reference_number', 'receipt')
        }),
        ('Additional Information', {
            'fields': ('notes',)
        }),
        ('Approval Information', {
            'fields': ('approved', 'approved_by', 'approved_date')
        }),
        ('System Fields', {
            'classes': ('collapse',),
            'fields': ('created_by', 'created_at', 'updated_at')
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # If creating a new object
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
