from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

# Define a custom UserAdmin to show only specific fields
class UserAdmin(BaseUserAdmin):
    # Define the fields we want to show
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

# Unregister the original User admin
admin.site.unregister(User)
# Register the User model with our custom admin
admin.site.register(User, UserAdmin) 