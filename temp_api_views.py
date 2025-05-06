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

    def perform_destroy(self, instance):
        """
        Override perform_destroy to also remove the group from all module permissions
        """
        from iceplant_core.group_permissions import HasModulePermission
        from iceplant_core.module_permissions import remove_module_permissions_from_group
        import logging
        
        # Get a logger
        logger = logging.getLogger(__name__)
        
        # Remove the group from all module permissions
        group_name = instance.name
        module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
        
        # Log the group being deleted
        logger.info(f"Removing group '{group_name}' from all module permissions")
        
        # Iterate through all modules and remove the group
        removed_any = False
        for module in module_mapping:
            if group_name in module_mapping[module]:
                # Remove from module mapping
                module_mapping[module].remove(group_name)
                removed_any = True
                logger.info(f"Removed '{group_name}' from '{module}' module")
                
                # Also remove Django permissions for this module
                remove_module_permissions_from_group(module, group_name)
        
        # Persist changes to disk if any changes were made
        if removed_any:
            try:
                from iceplant_core.module_permissions_utils import save_module_permissions
                save_module_permissions()
                logger.info("Module permissions persisted to disk after group removal")
            except Exception as e:
                logger.error(f"Error persisting module permissions: {e}")
        
        # Call the parent's perform_destroy to actually delete the group
        super().perform_destroy(instance)

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

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def update_group_module_permissions(request):
    """
    Update module permissions for a group.
    Request format:
    {
        "group_name": "Test Group",
        "modules": {
            "maintenance": true,
            "inventory": false,
            ...
        }
    }
    """
    from iceplant_core.group_permissions import HasModulePermission, MODULE_PERMISSION_MAPPING
    from iceplant_core.module_permissions_utils import assign_module_permissions_to_group, remove_module_permissions_from_group
    import logging
    
    # Get a logger
    logger = logging.getLogger(__name__)
    logger.info(f"Updating module permissions: {request.data}")
    
    group_name = request.data.get('group_name')
    modules = request.data.get('modules', {})
    
    if not group_name:
        return Response({"error": "Group name is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Check if group exists
        group = Group.objects.get(name=group_name)
    except Group.DoesNotExist:
        return Response({"error": f"Group '{group_name}' does not exist"}, status=status.HTTP_404_NOT_FOUND)
    
    # First, clean up any stale groups in the module mapping
    existing_groups = set(Group.objects.values_list('name', flat=True))
    
    # Update module permissions
    module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
    
    # Clean up first - remove any non-existent groups from all modules
    for module in module_mapping:
        module_mapping[module] = [g for g in module_mapping[module] if g in existing_groups]
    
    # First remove the group from all modules that aren't explicitly set to True
    # This ensures that we handle modules not included in the request
    all_modules = set(module_mapping.keys())
    modules_to_include = {m for m, v in modules.items() if v}
    modules_to_exclude = all_modules - modules_to_include
    
    # Remove group from all modules not explicitly included
    for module in modules_to_exclude:
        if module in module_mapping and group_name in module_mapping[module]:
            module_mapping[module].remove(group_name)
            logger.info(f"Removed {group_name} from {module} (excluded module)")
    
    # Now update the modules based on the request
    for module, has_access in modules.items():
        if module not in module_mapping:
            continue
            
        logger.info(f"Module {module}: {has_access}")
        
        if has_access:
            # Add group to module permissions if not already there
            if group_name not in module_mapping[module]:
                module_mapping[module].append(group_name)
                logger.info(f"Added {group_name} to {module}")
                
                # Also assign Django permissions for this module to the group
                assign_module_permissions_to_group(module, group_name)
        else:
            # Remove group from module permissions if it's there
            if group_name in module_mapping[module]:
                module_mapping[module].remove(group_name)
                logger.info(f"Removed {group_name} from {module}")
                
                # Also remove Django permissions for this module from the group
                remove_module_permissions_from_group(module, group_name)
                remove_module_permissions_from_group(group_name, module)
    
    # Persist changes to disk
    try:
        from iceplant_core.module_permissions_utils import save_module_permissions
        save_module_permissions()
        logger.info("Module permissions persisted to disk")
    except Exception as e:
        logger.error(f"Error persisting module permissions: {e}")
    
    # Log the final state for debugging
    logger.info(f"Final module mapping: {module_mapping}")
    
    return Response({
        "message": f"Module permissions updated for group '{group_name}'",
        "updated_mapping": module_mapping
    })
