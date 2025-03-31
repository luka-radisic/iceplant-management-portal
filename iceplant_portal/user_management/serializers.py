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
    permission_display = serializers.SerializerMethodField()
    
    class Meta:
        model = UserPermission
        fields = ['id', 'user', 'permission_type', 'permission_display']
    
    def get_permission_display(self, obj):
        return obj.get_permission_type_display()

class RolePermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RolePermission
        fields = ['id', 'role', 'permission_type']

class UserRoleSerializer(serializers.ModelSerializer):
    role_name = serializers.SerializerMethodField()
    
    class Meta:
        model = UserRoleAssignment
        fields = ['id', 'user', 'role', 'role_name', 'assigned_at', 'assigned_by']
    
    def get_role_name(self, obj):
        return obj.role.name

class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = UserRole
        fields = ['id', 'name', 'role_type', 'description', 'is_active', 'permissions', 'created_at', 'updated_at']
    
    def get_permissions(self, obj):
        # Get all permission types for this role
        role_permissions = RolePermission.objects.filter(role=obj)
        return [rp.permission_type for rp in role_permissions]
    
    def create(self, validated_data):
        permissions_data = self.context.get('request').data.get('permissions', [])
        
        # Create the role
        role = UserRole.objects.create(**validated_data)
        
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
        instance.save()
        
        # Update role permissions
        # First, delete existing permissions
        RolePermission.objects.filter(role=instance).delete()
        
        # Then create new permissions
        for permission_type in permissions_data:
            RolePermission.objects.create(role=instance, permission_type=permission_type)
            
        return instance 