from django.db import models
from django.utils import timezone

class Attendance(models.Model):
    employee_id = models.CharField(max_length=50)
    check_in = models.DateTimeField()
    check_out = models.DateTimeField(null=True, blank=True)
    department = models.CharField(max_length=50)
    import_date = models.DateField(default=timezone.now)
    
    class Meta:
        ordering = ['-check_in']
        verbose_name = 'Attendance Record'
        verbose_name_plural = 'Attendance Records'
    
    def __str__(self):
        return f"{self.employee_id} - {self.check_in.date()}"
    
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
