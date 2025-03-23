from django.contrib import admin
from django.utils import timezone
import pytz
from .models import Attendance, ImportLog, EmployeeShift, EmployeeProfile, DepartmentShift

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('employee_id', 'employee_name', 'manila_check_in', 'manila_check_out', 'department', 'import_date')
    list_filter = ('department', 'import_date', 'employee_id')
    search_fields = ('employee_id', 'employee_name', 'department')
    ordering = ('-check_in',)
    
    def manila_check_in(self, obj):
        """Display check-in time in Manila timezone"""
        if obj.check_in:
            manila_tz = pytz.timezone('Asia/Manila')
            return obj.check_in.astimezone(manila_tz).strftime('%Y-%m-%d %H:%M')
        return '-'
    manila_check_in.short_description = 'Check In (Manila)'
    
    def manila_check_out(self, obj):
        """Display check-out time in Manila timezone"""
        if obj.check_out:
            manila_tz = pytz.timezone('Asia/Manila')
            return obj.check_out.astimezone(manila_tz).strftime('%Y-%m-%d %H:%M')
        return '-'
    manila_check_out.short_description = 'Check Out (Manila)'

@admin.register(ImportLog)
class ImportLogAdmin(admin.ModelAdmin):
    list_display = ('filename', 'import_date', 'success', 'records_imported')
    list_filter = ('success', 'import_date')
    search_fields = ('filename',)
    ordering = ('-import_date',)
    readonly_fields = ('import_date', 'success', 'records_imported', 'error_message')

class EmployeeShiftAdmin(admin.ModelAdmin):
    list_display = ('employee_id', 'shift_type_display', 'shift_start', 'shift_end', 'break_duration', 'is_rotating_shift')
    list_filter = ('is_night_shift', 'is_rotating_shift')
    search_fields = ('employee_id',)
    
    def shift_type_display(self, obj):
        if obj.is_rotating_shift:
            return '12-Hour Rotating'
        return 'Night' if obj.is_night_shift else 'Morning'
    shift_type_display.short_description = 'Shift Type'

admin.site.register(EmployeeShift, EmployeeShiftAdmin)

@admin.register(DepartmentShift)
class DepartmentShiftAdmin(admin.ModelAdmin):
    list_display = ('department', 'shift_type_display', 'shift_start', 'shift_end', 'break_duration', 'is_rotating_shift')
    list_filter = ('is_night_shift', 'is_rotating_shift')
    search_fields = ('department',)
    
    def shift_type_display(self, obj):
        if obj.is_rotating_shift:
            return '12-Hour Rotating'
        return 'Night' if obj.is_night_shift else 'Morning'
    shift_type_display.short_description = 'Shift Type'
