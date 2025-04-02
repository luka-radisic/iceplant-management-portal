from django.contrib import admin
from .models import MaintenanceItem, MaintenanceRecord

@admin.register(MaintenanceItem)
class MaintenanceItemAdmin(admin.ModelAdmin):
    list_display = ('equipment_name', 'equipment_type', 'location', 'status', 'next_maintenance_date')
    list_filter = ('equipment_type', 'location', 'status')
    search_fields = ('equipment_name', 'serial_number', 'notes')
    date_hierarchy = 'created_at'

@admin.register(MaintenanceRecord)
class MaintenanceRecordAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'maintenance_date', 'maintenance_type', 'performed_by', 'status', 'cost')
    list_filter = ('maintenance_type', 'status')
    search_fields = ('maintenance_item__equipment_name', 'performed_by', 'actions_taken')
    date_hierarchy = 'maintenance_date'
