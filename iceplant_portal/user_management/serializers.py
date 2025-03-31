from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import UserPermission, UserRole, RolePermission, UserRoleAssignment

class UserSerializer(serializers.ModelSerializer):
    """Serializer for retrieving and updating users."""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_active', 'is_staff', 'is_superuser', 'date_joined', 'last_login']
        read_only_fields = ['id', 'date_joined', 'last_login']

class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating users with password validation."""
    
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'is_active', 'is_staff', 'is_superuser']
    
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            is_active=validated_data.get('is_active', True),
            is_staff=validated_data.get('is_staff', False),
            is_superuser=validated_data.get('is_superuser', False)
        )
        return user 

class PermissionSerializer(serializers.ModelSerializer):
    """Serializer for user permissions."""
    
    user_username = serializers.SerializerMethodField()
    permission_display = serializers.SerializerMethodField()
    
    class Meta:
        model = UserPermission
        fields = ['id', 'user', 'user_username', 'permission_type', 'permission_display']
    
    def get_user_username(self, obj):
        return obj.user.username
        
    def get_permission_display(self, obj):
        for perm_type, display in UserPermission.PERMISSION_TYPES:
            if perm_type == obj.permission_type:
                return display
        return obj.permission_type

class RoleSerializer(serializers.ModelSerializer):
    """Serializer for roles."""
    
    class Meta:
        model = UserRole
        fields = ['id', 'name', 'role_type', 'description', 'is_active', 'permissions', 'created_at', 'updated_at']
    
    # Use the permissions_json field directly
    permissions = serializers.SerializerMethodField()
    
    def get_permissions(self, obj):
        # Return the cached permissions from the JSON field
        if obj.permissions_json:
            return obj.permissions_json
        
        # Fallback to quering permissions if JSON field is empty
        role_permissions = RolePermission.objects.filter(role=obj)
        permissions = [rp.permission_type for rp in role_permissions]
        return permissions
    
    def create(self, validated_data):
        permissions_data = self.context.get('request').data.get('permissions', [])
        
        # Create the role
        role = UserRole.objects.create(**validated_data)
        role.permissions_json = permissions_data
        role.save(update_fields=['permissions_json'])
        
        # Create role permissions
        for permission_type in permissions_data:
            RolePermission.objects.create(role=role, permission_type=permission_type)
            
        return role
    
    def update(self, instance, validated_data):
        permissions_data = self.context.get('request').data.get('permissions', [])
        
        # Update the role
        instance.name = validated_data.get('name', instance.name)
        instance.role_type = validated_data.get('role_type', instance.role_type)
        instance.description = validated_data.get('description', instance.description)
        instance.is_active = validated_data.get('is_active', instance.is_active)
        instance.permissions_json = permissions_data
        instance.save()
        
        # Update role permissions
        # First, delete existing permissions
        RolePermission.objects.filter(role=instance).delete()
        
        # Then create new permissions
        for permission_type in permissions_data:
            RolePermission.objects.create(role=instance, permission_type=permission_type)
            
        return instance

class RolePermissionSerializer(serializers.ModelSerializer):
    """Serializer for role permissions."""
    
    role_name = serializers.SerializerMethodField()
    permission_display = serializers.SerializerMethodField()
    
    class Meta:
        model = RolePermission
        fields = ['id', 'role', 'role_name', 'permission_type', 'permission_display']
    
    def get_role_name(self, obj):
        return obj.role.name
        
    def get_permission_display(self, obj):
        for perm_type, display in UserPermission.PERMISSION_TYPES:
            if perm_type == obj.permission_type:
                return display
        return obj.permission_type

class UserRoleSerializer(serializers.ModelSerializer):
    """Serializer for user-role assignments."""
    
    user_username = serializers.SerializerMethodField()
    role_name = serializers.CharField(read_only=True)
    role_permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = UserRoleAssignment
        fields = ['id', 'user', 'user_username', 'role', 'role_name', 'assigned_at', 'assigned_by', 'role_permissions']
    
    def get_user_username(self, obj):
        return obj.user.username
    
    def get_role_permissions(self, obj):
        # Return the cached permissions from the role's JSON field
        if hasattr(obj.role, 'permissions_json') and obj.role.permissions_json:
            return obj.role.permissions_json
        
        # Fallback to querying role permissions
        role_permissions = RolePermission.objects.filter(role=obj.role)
        return [rp.permission_type for rp in role_permissions] 