from django.contrib import admin
from .models import Attendance, ImportLog

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('employee_id', 'check_in', 'check_out', 'department', 'import_date')
    list_filter = ('department', 'import_date')
    search_fields = ('employee_id', 'department')
    date_hierarchy = 'check_in'

@admin.register(ImportLog)
class ImportLogAdmin(admin.ModelAdmin):
    list_display = ('filename', 'import_date', 'success', 'records_imported')
    list_filter = ('success', 'import_date')
    search_fields = ('filename',)
    readonly_fields = ('import_date', 'success', 'records_imported', 'error_message')
