# Django Backend Import Error Fix

## Summary of Issue

The Django backend failed to start due to an import error: `ImportError: cannot import name 'UserSerializer' from 'users.serializers'`. This occurred because the serializers being imported didn't exist in the `serializers.py` file, despite being referenced elsewhere in the codebase.

## Details of the Fix

I added the two missing serializers to the `users/serializers.py` file:

1. `UserSerializer` - A general serializer for the User model with basic user information
2. `UserCreateSerializer` - A specialized serializer for user registration with password validation

## Implementation

The serializers were added with the following structure:

```python
class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 
                 'is_active', 'is_staff', 'is_superuser', 'groups']
        read_only_fields = ['is_superuser']
        
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new users"""
    password = serializers.CharField(write_only=True, required=True)
    confirm_password = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'confirm_password', 
                 'first_name', 'last_name', 'is_active', 'is_staff']
    
    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError({
                "confirm_password": "Password fields didn't match."
            })
        return attrs
    
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            is_active=validated_data.get('is_active', True),
            is_staff=validated_data.get('is_staff', False)
        )
        return user
```

## Impact

This fix resolves the import error and should allow the Django backend to start correctly. The application should now be able to:

1. Register new users
2. Manage existing users through the admin interface
3. Properly authenticate and authorize users

## Testing

To verify the fix is working, you can:

1. Start the Django backend with `docker-compose up`
2. Try accessing the user registration endpoint
3. Verify that users can be created and managed through the admin interface

## Notes

The most likely cause of this issue was:
- Code refactoring where serializers were moved between files
- Deletion of the code during cleanup without updating references
- Partial implementation where URL routes were defined but the corresponding serializers were missing

Additional testing is recommended to ensure all user management functionality works as expected.
