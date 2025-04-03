from django.db import models
from django.utils import timezone

class MaintenanceItem(models.Model):
    """Model for equipment that requires maintenance"""
    
    STATUS_CHOICES = [
        ('operational', 'Operational'),
        ('requires_maintenance', 'Requires Maintenance'),
        ('under_maintenance', 'Under Maintenance'),
        ('not_operational', 'Not Operational'),
    ]
    
    FREQUENCY_UNIT_CHOICES = [
        ('days', 'Days'),
        ('weeks', 'Weeks'),
        ('months', 'Months'),
        ('hours', 'Hours'),
    ]
    
    equipment_name = models.CharField(max_length=100)
    equipment_type = models.CharField(max_length=50)
    model_number = models.CharField(max_length=100, blank=True, null=True)
    serial_number = models.CharField(max_length=100, blank=True, null=True)
    location = models.CharField(max_length=100)
    installation_date = models.DateField(blank=True, null=True)
    maintenance_frequency = models.IntegerField(default=3)  # How often maintenance should be performed
    frequency_unit = models.CharField(max_length=10, choices=FREQUENCY_UNIT_CHOICES, default='months')
    next_maintenance_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='operational')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.equipment_name} - {self.equipment_type}"
    
    def save(self, *args, **kwargs):
        # Calculate next_maintenance_date if not provided
        if not self.next_maintenance_date and self.installation_date:
            if self.frequency_unit == 'days':
                self.next_maintenance_date = timezone.now().date() + timezone.timedelta(days=self.maintenance_frequency)
            elif self.frequency_unit == 'weeks':
                self.next_maintenance_date = timezone.now().date() + timezone.timedelta(weeks=self.maintenance_frequency)
            elif self.frequency_unit == 'months':
                # Use timezone.now().date() instead of installation_date if we're calculating for the first time
                current_date = timezone.now().date()
                month = current_date.month - 1 + self.maintenance_frequency
                year = current_date.year + month // 12
                month = month % 12 + 1
                day = min(current_date.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
                self.next_maintenance_date = timezone.datetime(year, month, day).date()
            elif self.frequency_unit == 'hours':
                # For 'hours', we just add the equivalent days (assuming 8-hour workdays)
                work_days = self.maintenance_frequency // 8
                self.next_maintenance_date = timezone.now().date() + timezone.timedelta(days=work_days)
        
        super().save(*args, **kwargs)


class MaintenanceRecord(models.Model):
    """Model for maintenance record entries"""
    
    MAINTENANCE_TYPE_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('emergency', 'Emergency'),
        ('preventive', 'Preventive'),
        ('corrective', 'Corrective'),
    ]
    
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]
    
    maintenance_item = models.ForeignKey(
        MaintenanceItem, 
        on_delete=models.CASCADE, 
        related_name='records',
        null=True, 
        blank=True
    )
    maintenance_date = models.DateField(null=True, blank=True)
    maintenance_type = models.CharField(
        max_length=20, 
        choices=MAINTENANCE_TYPE_CHOICES,
        default='scheduled',
        null=True, 
        blank=True
    )
    performed_by = models.CharField(max_length=100, null=True, blank=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True)
    parts_replaced = models.TextField(blank=True, null=True)
    duration = models.FloatField(default=1.0, null=True, blank=True)  # Duration in hours
    issues_found = models.TextField(blank=True, null=True)
    actions_taken = models.TextField(default="Routine maintenance performed", null=True, blank=True)
    recommendations = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES,
        default='scheduled',
        null=True, 
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.maintenance_item.equipment_name} - {self.maintenance_date}"

    def save(self, *args, **kwargs):
        """Override save to update linked MaintenanceItem when record is completed."""
        is_new = self._state.adding # Check if this is a new record
        
        # Check if the status is being set to 'completed'
        # We might only want to update the item when the record is first marked completed
        update_item = False
        if self.status == 'completed':
            if is_new:
                update_item = True # Always update if new record is completed
            else:
                # If updating, only update item if status *changed* to completed
                try:
                    old_instance = MaintenanceRecord.objects.get(pk=self.pk)
                    if old_instance.status != 'completed':
                        update_item = True
                except MaintenanceRecord.DoesNotExist:
                    update_item = True # Should not happen if not new, but handle anyway
        
        super().save(*args, **kwargs) # Save the record itself first

        if update_item and self.maintenance_item:
            item = self.maintenance_item
            item.last_maintenance_date = self.maintenance_date or timezone.now().date()
            # Optionally update status - maybe only if it was 'requires_maintenance'?
            if item.status in ['requires_maintenance', 'under_maintenance', 'not_operational']:
                 item.status = 'operational' 
            # The MaintenanceItem's save method should recalculate next_maintenance_date
            item.save()
