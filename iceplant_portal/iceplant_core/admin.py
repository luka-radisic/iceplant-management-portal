from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

# Define a custom UserAdmin to exclude unwanted fields
class UserAdmin(BaseUserAdmin):
    # Exclude the fields we don't want to see
    exclude = ('user_permissions', 'groups')

# Unregister the original User admin
admin.site.unregister(User)
# Register the User model with our custom admin
admin.site.register(User, UserAdmin) 