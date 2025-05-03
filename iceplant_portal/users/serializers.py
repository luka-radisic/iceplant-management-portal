from django.contrib.auth.models import User, Group
from rest_framework import serializers

class GroupSerializer(serializers.ModelSerializer):
    """Serializer for Group model with count of users"""
    user_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Group
        fields = ['id', 'name', 'user_count']
    
    def get_user_count(self, obj):
        return obj.user_set.count()

class GroupDetailSerializer(serializers.ModelSerializer):
    """Detailed Group serializer with permissions"""
    users = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = Group
        fields = ['id', 'name', 'users', 'permissions']
    
    def get_users(self, obj):
        return [
            {
                'id': user.id,
                'username': user.username,
                'full_name': f"{user.first_name} {user.last_name}".strip() or user.username
            }
            for user in obj.user_set.all()
        ]
    
    def get_permissions(self, obj):
        # Get permissions from the MODULE_GROUP_MAPPING
        from iceplant_core.group_permissions import HasModulePermission
        
        module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
        group_permissions = {}
        
        for module, allowed_groups in module_mapping.items():
            group_permissions[module] = obj.name in allowed_groups
        
        return group_permissions

class UserListSerializer(serializers.ModelSerializer):
    """Serializer for listing users with their groups"""
    full_name = serializers.SerializerMethodField()
    groups = serializers.StringRelatedField(many=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'is_active', 'is_staff', 'is_superuser', 'groups']
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

class UserGroupAssignmentSerializer(serializers.Serializer):
    """Serializer for assigning users to groups"""
    user_id = serializers.IntegerField()
    group_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
