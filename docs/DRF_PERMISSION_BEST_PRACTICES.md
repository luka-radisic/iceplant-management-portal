# Django REST Framework Permission Class Best Practices

## Introduction

This guide documents best practices for implementing custom permission classes in Django REST Framework (DRF). It was created in response to permission-related issues identified and fixed in the IcePlant Management Portal.

## Common Issues

1. **Incorrect Instantiation Patterns**
   - Using parameterized permission classes directly in `permission_classes`
   - Example of problematic code:
   ```python
   permission_classes = [IsInGroups(['Admins'])]  # INCORRECT
   permission_classes = [HasModulePermission('maintenance')]  # INCORRECT
   ```

2. **"Object is not callable" Errors**
   - DRF tries to instantiate permission classes with `permission()`
   - When a permission class is already instantiated, this causes a TypeError

3. **Inconsistent Implementation Patterns**
   - Mixing different styles of permission class usage
   - Lack of clear pattern for module-specific permissions

## Best Practices

### 1. Extend BasePermission for Custom Logic

```python
from rest_framework.permissions import BasePermission

class CustomPermission(BasePermission):
    def has_permission(self, request, view):
        # Custom logic here
        return True
```

### 2. For Parameterized Permissions, Create Subclasses

**INCORRECT:**
```python
permission_classes = [IsInGroups(['Admins', 'Managers'])]
```

**CORRECT:**
```python
class IsAdminOrManager(IsInGroups):
    def __init__(self):
        super().__init__(groups=['Admins', 'Managers'])

permission_classes = [IsAdminOrManager]
```

### 3. For Module-Based Permissions, Use Dedicated Classes

**INCORRECT:**
```python
permission_classes = [HasModulePermission('maintenance')]
```

**CORRECT:**
```python
class HasMaintenanceModulePermission(HasModulePermission):
    def __init__(self):
        super().__init__(module='maintenance')

permission_classes = [HasMaintenanceModulePermission]
```

### 4. Combine Permissions with AND/OR Logic

```python
# All permissions must pass (AND logic)
permission_classes = [IsAuthenticated, IsAdminUser]

# Either permission can pass (OR logic)
class IsAuthenticatedOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.method in SAFE_METHODS or
            request.user and
            request.user.is_authenticated
        )
```

### 5. Permission Class Implementation Template

```python
class ModulePermission(BasePermission):
    """
    Permission class template for module-specific access.
    """
    module_name = None  # Override this in subclasses
    
    def has_permission(self, request, view):
        # Superusers always pass
        if request.user.is_superuser:
            return True
            
        # Must be authenticated
        if not request.user.is_authenticated:
            return False
            
        # Must have module name defined
        if not self.module_name:
            return False
            
        # Check group membership
        allowed_groups = self.get_allowed_groups()
        user_groups = request.user.groups.values_list('name', flat=True)
        return any(group in user_groups for group in allowed_groups)
    
    def get_allowed_groups(self):
        """Override this method in subclasses to define allowed groups"""
        return []

# Example subclass
class HasInventoryPermission(ModulePermission):
    module_name = 'inventory'
    
    def get_allowed_groups(self):
        return ['Inventory', 'Operations', 'Managers', 'Admins']
```

## Implementation Examples

### User Management Permission

```python
class IsAdmin(IsInGroups):
    def __init__(self):
        super().__init__(groups=['Admins'])

class UserManagementViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdmin]
```

### Module-Specific Permission

```python
class HasSalesModulePermission(HasModulePermission):
    def __init__(self):
        super().__init__(module='sales')

class SalesViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasSalesModulePermission]
```

## Testing Permission Classes

### Unit Testing

```python
from django.test import TestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIRequestFactory
from .permissions import IsAdmin

class PermissionTestCase(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.admin_group = Group.objects.create(name='Admins')
        self.admin_user = User.objects.create_user('admin', 'admin@example.com', 'password')
        self.admin_user.groups.add(self.admin_group)
        self.regular_user = User.objects.create_user('user', 'user@example.com', 'password')
    
    def test_admin_permission(self):
        request = self.factory.get('/')
        request.user = self.admin_user
        
        permission = IsAdmin()
        self.assertTrue(permission.has_permission(request, None))
        
        request.user = self.regular_user
        self.assertFalse(permission.has_permission(request, None))
```

### Integration Testing

```python
from rest_framework.test import APITestCase

class ModulePermissionTestCase(APITestCase):
    def setUp(self):
        # Create users and assign to groups
        # ...
    
    def test_maintenance_access(self):
        # Test with admin user
        self.client.login(username='admin', password='password')
        response = self.client.get('/api/maintenance/dashboard/')
        self.assertEqual(response.status_code, 200)
        
        # Test with unauthorized user
        self.client.login(username='user', password='password')
        response = self.client.get('/api/maintenance/dashboard/')
        self.assertEqual(response.status_code, 403)
```

## Conclusion

Following these best practices ensures that permission classes work correctly with Django REST Framework and provides a consistent approach to implementing access control throughout your application.
