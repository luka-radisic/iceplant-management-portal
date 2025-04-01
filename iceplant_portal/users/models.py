from django.db import models
from django.contrib.auth.models import User

# Define permission levels
class UserPermission(models.Model):
    """
    Custom permission model for fine-grained user access control
    """
    PERMISSION_TYPES = [
        # Inventory permissions
        ('inventory_view', 'Can view inventory'),
        ('inventory_add', 'Can add inventory items'),
        ('inventory_edit', 'Can edit inventory items'),
        ('inventory_delete', 'Can delete inventory items'),
        
        # Sales permissions
        ('sales_view', 'Can view sales'),
        ('sales_add', 'Can add sales'),
        ('sales_edit', 'Can edit sales'),
        ('sales_delete', 'Can delete sales'),
        
        # Expenses permissions
        ('expenses_view', 'Can view expenses'),
        ('expenses_add', 'Can add expenses'),
        ('expenses_edit', 'Can edit expenses'),
        ('expenses_delete', 'Can delete expenses'),
        ('expenses_approve', 'Can approve expenses'),
        
        # Buyers permissions
        ('buyers_view', 'Can view buyers'),
        ('buyers_add', 'Can add buyers'),
        ('buyers_edit', 'Can edit buyers'),
        ('buyers_delete', 'Can delete buyers'),
        
        # Attendance permissions
        ('attendance_view', 'Can view attendance'),
        ('attendance_add', 'Can add attendance'),
        ('attendance_edit', 'Can edit attendance'),
        
        # Reports permissions
        ('reports_view', 'Can view reports'),
        ('reports_export', 'Can export reports'),
        
        # User management permissions
        ('user_management', 'Can manage users'),
        ('permissions_management', 'Can manage user permissions'),
    ]
    
    user = models.ForeignKey(User, related_name='permissions', on_delete=models.CASCADE)
    permission_type = models.CharField(max_length=50, choices=PERMISSION_TYPES)
    
    class Meta:
        unique_together = ('user', 'permission_type')
        verbose_name = 'User Permission'
        verbose_name_plural = 'User Permissions'
    
    def __str__(self):
        return f"{self.user.username} - {self.get_permission_type_display()}"

# User role definitions
class UserRole(models.Model):
    """
    Predefined roles with associated permissions
    """
    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('manager', 'Manager'),
        ('accountant', 'Accountant'),
        ('sales_agent', 'Sales Agent'),
        ('inventory_clerk', 'Inventory Clerk'),
        ('viewer', 'Viewer'),
        ('custom', 'Custom Role'),
    ]
    
    name = models.CharField(max_length=100)
    role_type = models.CharField(max_length=50, choices=ROLE_CHOICES)
    description = models.TextField(blank=True)
    
    def __str__(self):
        return self.name
        
# Role-Permission relationship
class RolePermission(models.Model):
    """
    Maps permissions to roles
    """
    role = models.ForeignKey(UserRole, related_name='role_permissions', on_delete=models.CASCADE)
    permission_type = models.CharField(max_length=50, choices=UserPermission.PERMISSION_TYPES)
    
    class Meta:
        unique_together = ('role', 'permission_type')

    def __str__(self):
        return f"{self.role.name} - {self.permission_type}" 