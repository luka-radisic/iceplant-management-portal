from django.db import models
from django.contrib.auth.models import User

# Create your models here.

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
    
    user = models.ForeignKey(User, related_name='custom_permissions', on_delete=models.CASCADE)
    permission_type = models.CharField(max_length=50, choices=PERMISSION_TYPES)
    permission_display = models.CharField(max_length=100, blank=True)
    
    class Meta:
        unique_together = ('user', 'permission_type')
    
    def __str__(self):
        return f"{self.user.username} - {self.get_permission_type_display()}"
    
    def save(self, *args, **kwargs):
        # Set the display name if not provided
        if not self.permission_display:
            for perm_type, display in self.PERMISSION_TYPES:
                if perm_type == self.permission_type:
                    self.permission_display = display
                    break
        super().save(*args, **kwargs)

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
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    permissions_json = models.JSONField(default=list, blank=True, help_text="JSON array of permission names")
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        # Ensure role_type is lowercase for consistency
        self.role_type = self.role_type.lower()
        super().save(*args, **kwargs)
        
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
        
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update the permissions_json field in the role
        role = self.role
        permissions = RolePermission.objects.filter(role=role).values_list('permission_type', flat=True)
        role.permissions_json = list(permissions)
        role.save(update_fields=['permissions_json'])

# User-Role assignment
class UserRoleAssignment(models.Model):
    """
    Assigns roles to users
    """
    user = models.ForeignKey(User, related_name='role_assignments', on_delete=models.CASCADE)
    role = models.ForeignKey(UserRole, related_name='user_assignments', on_delete=models.CASCADE)
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(User, related_name='role_assignments_made', 
                                   on_delete=models.SET_NULL, null=True, blank=True)
    role_name = models.CharField(max_length=100, blank=True, help_text="Cached role name for easier querying")
    
    class Meta:
        unique_together = ('user', 'role')
        verbose_name = 'User Role Assignment'
        verbose_name_plural = 'User Role Assignments'
    
    def __str__(self):
        return f"{self.user.username} - {self.role.name}"
    
    def save(self, *args, **kwargs):
        # Store the role name for easier querying
        self.role_name = self.role.name
        super().save(*args, **kwargs)
