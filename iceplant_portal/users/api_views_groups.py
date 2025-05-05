from django.contrib.auth.models import User, Group
from rest_framework import serializers, viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from iceplant_core.group_permissions import IsInGroups

# Define custom permission class for Admins group
class IsAdmin(IsInGroups):
    def __init__(self):
        super().__init__(groups=['Admins'])


class GroupSerializer(serializers.ModelSerializer):
    """Serializer for Group model"""
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ['id', 'name', 'user_count']
    
    def get_user_count(self, obj):
        return obj.user_set.count()


class UserGroupSerializer(serializers.ModelSerializer):
    """Serializer for User model with groups"""
    groups = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_superuser', 'is_staff', 'groups']
    
    def get_groups(self, obj):
        return obj.groups.values_list('name', flat=True)


class GroupViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing user groups.
    Only accessible to users in the 'Admins' group.
    """
    queryset = Group.objects.all().order_by('name')
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def create(self, request, *args, **kwargs):
        name = request.data.get('name')
        if not name:
            return Response({"error": "Group name is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if group already exists
        if Group.objects.filter(name=name).exists():
            return Response({"error": f"Group '{name}' already exists"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create new group
        group = Group.objects.create(name=name)
        
        # Add users to group if provided
        user_ids = request.data.get('user_ids', [])
        if user_ids:
            users = User.objects.filter(id__in=user_ids)
            for user in users:
                user.groups.add(group)
        
        return Response(self.get_serializer(group).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        group = self.get_object()
        name = request.data.get('name')
        
        if name and name != group.name:
            # Check if new name conflicts with existing group
            if Group.objects.filter(name=name).exists():
                return Response({"error": f"Group '{name}' already exists"}, status=status.HTTP_400_BAD_REQUEST)
            group.name = name
            group.save()
        
        # Update users in group if provided
        user_ids = request.data.get('user_ids')
        if user_ids is not None:
            # Clear existing users and add new ones
            group.user_set.clear()
            users = User.objects.filter(id__in=user_ids)
            for user in users:
                user.groups.add(group)
        
        return Response(self.get_serializer(group).data)

    def destroy(self, request, *args, **kwargs):
        group = self.get_object()
        # Check if this is a protected group
        protected_groups = ['Admins', 'Managers'] # Add other protected groups here
        if group.name in protected_groups:
            return Response(
                {"error": f"Cannot delete protected group '{group.name}'"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def users(self, request, pk=None):
        """Get users belonging to this group"""
        group = self.get_object()
        users = group.user_set.all()
        serializer = UserGroupSerializer(users, many=True)
        return Response(serializer.data)


class UserManagementViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing users and their group assignments.
    Only accessible to users in the 'Admins' group.
    """
    queryset = User.objects.all().order_by('username')
    serializer_class = UserGroupSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    @action(detail=True, methods=['post'])
    def assign_groups(self, request, pk=None):
        """Assign groups to a user"""
        user = self.get_object()
        group_ids = request.data.get('group_ids', [])
        if not isinstance(group_ids, list):
            return Response({"error": "group_ids must be a list"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if trying to modify a superuser (only superusers can do this)
        if user.is_superuser and not request.user.is_superuser:
            return Response(
                {"error": "Only superusers can modify other superusers' groups"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Clear existing groups and add new ones
        user.groups.clear()
        if group_ids:
            groups = Group.objects.filter(id__in=group_ids)
            for group in groups:
                user.groups.add(group)
        
        return Response(self.get_serializer(user).data)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user information"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def module_group_mapping(request):
    """
    Get the module-group mapping for permissions overview.
    Only accessible to users in the 'Admins' group.
    """
    from iceplant_core.group_permissions import HasModulePermission
    
    if not request.user.is_superuser and not any(
        group.name == 'Admins' for group in request.user.groups.all()
    ):
        return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
    
    mapping = HasModulePermission.MODULE_GROUP_MAPPING
    return Response(mapping)
