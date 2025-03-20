from django.contrib import admin
from .models import Inventory, InventoryAdjustment

class InventoryAdjustmentInline(admin.TabularInline):
    model = InventoryAdjustment
    extra = 0
    readonly_fields = ('adjustment_date',)

@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ('item_name', 'quantity', 'unit', 'minimum_level', 'is_low', 'last_updated')
    list_filter = ('unit',)
    search_fields = ('item_name',)
    readonly_fields = ('last_updated', 'created_at', 'is_low')
    inlines = [InventoryAdjustmentInline]

@admin.register(InventoryAdjustment)
class InventoryAdjustmentAdmin(admin.ModelAdmin):
    list_display = ('inventory', 'previous_quantity', 'new_quantity', 'adjustment_amount', 'adjustment_date')
    list_filter = ('adjustment_date',)
    search_fields = ('inventory__item_name', 'reason')
    date_hierarchy = 'adjustment_date'
    readonly_fields = ('adjustment_amount',)
