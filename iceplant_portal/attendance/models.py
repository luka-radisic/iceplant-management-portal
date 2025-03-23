from django.db import models
from django.utils import timezone
import pytz
from datetime import datetime, time, timedelta
import os

def employee_photo_path(instance, filename):
    """
    Generate a unique path for each employee's photo.
    Path format: employee_photos/employee_{id}/{timestamp}_{filename}
    """
    # Get the original file extension
    ext = filename.split('.')[-1].lower()
    
    # Create a unique filename using employee ID and timestamp
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S_%f')
    new_filename = f'profile_{instance.employee_id}_{timestamp}.{ext}'
    
    # Create a unique path for each employee
    return os.path.join('employee_photos', f'employee_{instance.employee_id}', new_filename)

class EmployeeProfile(models.Model):
    """Store employee profile information including photo"""
    employee_id = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=100)
    photo = models.ImageField(
        upload_to=employee_photo_path,
        null=True,
        blank=True,
        help_text="Employee profile photo"
    )
    department = models.CharField(max_length=50)
    position = models.CharField(max_length=100, blank=True)
    date_joined = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    track_shifts = models.BooleanField(
        default=False,
        help_text="Enable shift tracking for this employee"
    )
    department_track_shifts = models.BooleanField(
        default=False,
        help_text="Department-level setting for shift tracking"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.full_name} ({self.employee_id})"

    class Meta:
        ordering = ['employee_id']
        verbose_name = 'Employee Profile'
        verbose_name_plural = 'Employee Profiles'

    def save(self, *args, **kwargs):
        # Delete old photo if it's being replaced
        if self.pk:
            try:
                old_instance = EmployeeProfile.objects.get(pk=self.pk)
                if old_instance.photo and self.photo != old_instance.photo:
                    old_instance.photo.delete(save=False)
            except EmployeeProfile.DoesNotExist:
                pass
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Delete the photo file when the profile is deleted
        if self.photo:
            self.photo.delete(save=False)
        super().delete(*args, **kwargs)

class Attendance(models.Model):
    employee_id = models.CharField(max_length=50)
    employee_name = models.CharField(max_length=100, null=True, blank=True)
    check_in = models.DateTimeField()
    check_out = models.DateTimeField(null=True, blank=True)
    department = models.CharField(max_length=50)
    import_date = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        # Ensure times are stored in UTC
        if isinstance(self.check_in, str):
            manila_tz = pytz.timezone('Asia/Manila')
            self.check_in = manila_tz.localize(datetime.strptime(self.check_in, '%Y-%m-%d %H:%M')).astimezone(pytz.UTC)
        if self.check_out and isinstance(self.check_out, str):
            manila_tz = pytz.timezone('Asia/Manila')
            self.check_out = manila_tz.localize(datetime.strptime(self.check_out, '%Y-%m-%d %H:%M')).astimezone(pytz.UTC)
        super().save(*args, **kwargs)

    def get_manila_time(self, dt):
        """Convert UTC time to Manila time"""
        if dt:
            manila_tz = pytz.timezone('Asia/Manila')
            return dt.astimezone(manila_tz)
        return None

    @property
    def manila_check_in(self):
        return self.get_manila_time(self.check_in)

    @property
    def manila_check_out(self):
        return self.get_manila_time(self.check_out)

    class Meta:
        ordering = ['-check_in']
        verbose_name = 'Attendance Record'
        verbose_name_plural = 'Attendance Records'
        indexes = [
            models.Index(fields=['employee_id']),
            models.Index(fields=['check_in']),
            models.Index(fields=['department']),
        ]
    
    def __str__(self):
        name_display = self.employee_name or self.employee_id
        return f"{name_display} ({self.employee_id}) - {self.check_in.date()}"
    
    @property
    def duration(self):
        """Calculate the duration between check-in and check-out"""
        if self.check_out:
            return self.check_out - self.check_in
        return None

class ImportLog(models.Model):
    """Keep track of imported XLSX files"""
    filename = models.CharField(max_length=255)
    import_date = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True, null=True)
    records_imported = models.IntegerField(default=0)
    
    def __str__(self):
        return f"{self.filename} ({self.import_date.date()})"

class EmployeeShift(models.Model):
    """Store shift configuration per employee"""
    employee_id = models.CharField(max_length=50, unique=True)
    department = models.CharField(max_length=50, null=True, blank=True, help_text="Employee's department for shift inheritance")
    shift_start = models.TimeField(help_text="Shift start time (e.g., 06:00 for morning, 18:00 for night)")
    shift_end = models.TimeField(help_text="Shift end time (e.g., 16:00 for morning, 04:00 for night)")
    break_duration = models.IntegerField(default=2, help_text="Break duration in hours")
    is_night_shift = models.BooleanField(default=False, help_text="If True, shift ends next day")
    is_rotating_shift = models.BooleanField(default=False, help_text="If True, employee works rotating shifts")
    rotation_partner_id = models.CharField(max_length=50, null=True, blank=True, 
        help_text="Employee ID of the rotation partner for 12-hour shifts")
    shift_duration = models.IntegerField(default=8, help_text="Shift duration in hours")
    use_department_settings = models.BooleanField(default=True, help_text="If True, use department shift settings")
    
    def __str__(self):
        shift_type = "Night" if self.is_night_shift else "Morning"
        return f"{self.employee_id} - {shift_type} Shift ({self.shift_start.strftime('%H:%M')}-{self.shift_end.strftime('%H:%M')})"

    def save(self, *args, **kwargs):
        if self.use_department_settings:
            try:
                dept_shift = DepartmentShift.objects.get(department=self.department)
                self.shift_start = dept_shift.shift_start
                self.shift_end = dept_shift.shift_end
                self.break_duration = dept_shift.break_duration
                self.is_night_shift = dept_shift.is_night_shift
                self.is_rotating_shift = dept_shift.is_rotating_shift
                self.shift_duration = dept_shift.shift_duration
            except DepartmentShift.DoesNotExist:
                pass
        super().save(*args, **kwargs)

    def get_shift_period(self, check_in_time):
        """
        Determine the shift period for a given check-in time.
        Returns a tuple of (shift_start_datetime, shift_end_datetime)
        """
        # Convert check_in_time to datetime if it's not already
        if isinstance(check_in_time, str):
            check_in_time = datetime.fromisoformat(check_in_time)
        
        check_in_date = check_in_time.date()
        check_in_hour = check_in_time.hour
        check_in_minute = check_in_time.minute
        
        # For rotating 12-hour shifts
        if self.is_rotating_shift:
            # Define the two possible shifts
            morning_start = datetime.combine(check_in_date, datetime.strptime("06:00", "%H:%M").time())
            morning_end = datetime.combine(check_in_date, datetime.strptime("18:00", "%H:%M").time())
            night_start = datetime.combine(check_in_date, datetime.strptime("18:00", "%H:%M").time())
            night_end = datetime.combine(check_in_date + timedelta(days=1), datetime.strptime("06:00", "%H:%M").time())
            
            # Check which shift period the check-in belongs to
            check_in_datetime = datetime.combine(check_in_date, check_in_time.time())
            
            # If check-in is between 18:00 and 23:59
            if check_in_hour >= 18:
                return (night_start, night_end)
            # If check-in is between 00:00 and 06:00
            elif check_in_hour < 6:
                return (night_start - timedelta(days=1), night_end - timedelta(days=1))
            # If check-in is between 06:00 and 17:59
            else:
                return (morning_start, morning_end)
        
        # For regular shifts
        shift_start_time = datetime.combine(check_in_date, self.shift_start)
        shift_end_time = datetime.combine(check_in_date, self.shift_end)
        
        # Handle night shifts that cross midnight
        if self.is_night_shift and self.shift_end < self.shift_start:
            if check_in_hour < 12:  # If check-in is in the morning
                shift_start_time = shift_start_time - timedelta(days=1)
            else:
                shift_end_time = shift_end_time + timedelta(days=1)
        
        return (shift_start_time, shift_end_time)

    def is_within_shift(self, check_in_time, previous_records=None):
        """
        Determine if a check-in time falls within the employee's shift period,
        considering previous records for the same shift.
        """
        shift_start, shift_end = self.get_shift_period(check_in_time)
        
        # Basic time check
        check_in_datetime = datetime.combine(check_in_time.date(), check_in_time.time())
        is_in_shift_time = shift_start <= check_in_datetime <= shift_end
        
        # If we have previous records, check if this is part of an ongoing shift
        if previous_records and is_in_shift_time:
            for record in previous_records:
                prev_shift_start, prev_shift_end = self.get_shift_period(record.check_in)
                if prev_shift_start == shift_start:
                    return True
        
        return is_in_shift_time

    def get_shift_type(self, check_in_time):
        """
        Determine the type of shift based on check-in time.
        Returns: 'Morning Shift', 'Night Shift', or 'Outside Shift Hours'
        """
        shift_start, shift_end = self.get_shift_period(check_in_time)
        check_in_datetime = datetime.combine(check_in_time.date(), check_in_time.time())
        
        if shift_start <= check_in_datetime <= shift_end:
            if self.is_night_shift or (self.is_rotating_shift and check_in_datetime.hour >= 18):
                return 'Night Shift'
            return 'Morning Shift'
        return 'Outside Shift Hours'

class DepartmentShift(models.Model):
    """Store shift configuration per department"""
    department = models.CharField(max_length=50, unique=True)
    shift_start = models.TimeField(help_text="Default shift start time for the department")
    shift_end = models.TimeField(help_text="Default shift end time for the department")
    break_duration = models.IntegerField(default=2, help_text="Default break duration in hours")
    is_night_shift = models.BooleanField(default=False, help_text="If True, shift ends next day")
    is_rotating_shift = models.BooleanField(default=False, help_text="If True, department uses rotating shifts")
    shift_duration = models.IntegerField(default=8, help_text="Default shift duration in hours")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        shift_type = "Night" if self.is_night_shift else "Morning"
        return f"{self.department} - {shift_type} Shift ({self.shift_start.strftime('%H:%M')}-{self.shift_end.strftime('%H:%M')})"

    class Meta:
        verbose_name = 'Department Shift'
        verbose_name_plural = 'Department Shifts'
        ordering = ['department']
