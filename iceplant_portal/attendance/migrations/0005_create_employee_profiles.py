from django.db import migrations
from django.utils import timezone

def create_employee_profiles(apps, schema_editor):
    """Create employee profiles for existing employees based on attendance records"""
    Attendance = apps.get_model('attendance', 'Attendance')
    EmployeeProfile = apps.get_model('attendance', 'EmployeeProfile')
    
    # Get unique employees from attendance records
    employees = Attendance.objects.values('employee_id', 'employee_name', 'department').distinct()
    
    # Create profiles for each employee
    for emp in employees:
        EmployeeProfile.objects.get_or_create(
            employee_id=emp['employee_id'],
            defaults={
                'full_name': emp['employee_name'] or f"Employee {emp['employee_id']}",
                'department': emp['department'],
                'is_active': True,
                'date_joined': timezone.now().date()
            }
        )

def reverse_employee_profiles(apps, schema_editor):
    """Remove created employee profiles"""
    EmployeeProfile = apps.get_model('attendance', 'EmployeeProfile')
    EmployeeProfile.objects.all().delete()

class Migration(migrations.Migration):
    dependencies = [
        ('attendance', '0004_employeeshift_is_rotating_shift_and_more'),
    ]

    operations = [
        migrations.RunPython(create_employee_profiles, reverse_employee_profiles),
    ] 