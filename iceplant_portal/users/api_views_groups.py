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
        # Import the global MODULE_GROUP_MAPPING directly
        from iceplant_core.group_permissions import MODULE_GROUP_MAPPING
        # Import the save utility
        from iceplant_core.module_permissions_utils import save_module_permissions
        import logging # Make sure logging is imported if not already at the top of the file
        
        logger = logging.getLogger(__name__)
        
        group_name = instance.name
        module_mapping = MODULE_GROUP_MAPPING 
        
        logger.info(f"Attempting to remove group '{group_name}' from all module permissions.")
        
        removed_any = False
        # Iterate over module names (keys of the mapping)
        for module_name in list(module_mapping.keys()): # Use list() for safe iteration
            if module_name in module_mapping and isinstance(module_mapping[module_name], list):
                if group_name in module_mapping[module_name]:
                    module_mapping[module_name].remove(group_name)
                    logger.info(f"Removed group '{group_name}' from module '{module_name}'.")
                    removed_any = True
                    # Optional: If a module's group list becomes empty, you might want to remove the module key
                    # if not module_mapping[module_name]:
                    #     del module_mapping[module_name]
                    #     logger.info(f"Module '{module_name}' is now empty and removed from mapping.")

        if removed_any:
            logger.info(f"Changes made to module permissions for group '{group_name}'. Attempting to save.")
            try:
                save_success, _ = save_module_permissions() 
                if save_success:
                    logger.info(f"Module permissions successfully persisted to disk after removing group '{group_name}'.")
                else:
                    logger.error(f"Failed to save module permissions to one or more locations after group '{group_name}' removal.")
            except Exception as e:
                logger.error(f"Error persisting module permissions after group '{group_name}' removal: {e}")
        else:
            logger.info(f"Group '{group_name}' was not found in any module permissions. No changes to save.")
        
        # Call the parent's perform_destroy to actually delete the group from the database
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
    # Import the global MODULE_GROUP_MAPPING directly
    from iceplant_core.group_permissions import MODULE_GROUP_MAPPING
    
    if not request.user.is_superuser and not any(
        group.name == 'Admins' for group in request.user.groups.all()
    ):
        return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
    
    # Use the imported global MODULE_GROUP_MAPPING
    mapping = MODULE_GROUP_MAPPING
    return Response(mapping)

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def update_group_module_permissions(request):
    """
    Update module permissions for a specific group.
    The request body should specify the group and a dictionary of modules
    indicating whether the group should have access to each.

    Request format:
    {
        "group_name": "Target Group Name",
        "modules": {
            "module_A": true,  // Grant access to module_A
            "module_B": false, // Revoke access to module_B
            "module_C": true  // Grant access to module_C
        }
    }
    """
    import logging
    # Import the necessary functions from the refactored module_permissions_utils
    from iceplant_core.module_permissions_utils import (
        set_modules_for_group,
        get_module_permissions,
        reload_module_permissions # For ensuring consistency if needed, though set_modules_for_group saves
    )

    logger = logging.getLogger(__name__)
    logger.info(f"Received request to update module permissions: {request.data}")

    group_name = request.data.get('group_name')
    if not group_name:
        logger.warning("Update module permissions request failed: Group name is required.")
        return Response({"error": "Group name is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        Group.objects.get(name=group_name)
    except Group.DoesNotExist:
        logger.warning(f"Update module permissions request failed: Group '{group_name}' does not exist.")
        return Response({"error": f"Group '{group_name}' does not exist"}, status=status.HTTP_404_NOT_FOUND)

    requested_module_access = request.data.get('modules', {})
    if not isinstance(requested_module_access, dict):
        logger.warning("Update module permissions request failed: 'modules' must be a dictionary.")
        return Response({"error": "'modules' field must be a dictionary."}, status=status.HTTP_400_BAD_REQUEST)

    # Determine the list of modules the group should be assigned to based on the request
    assigned_modules_for_this_group = []
    for module_name, has_access in requested_module_access.items():
        if not isinstance(module_name, str) or not isinstance(has_access, bool):
            logger.warning(f"Invalid entry in 'modules' dictionary: ('{module_name}': {has_access}). Skipping.")
            continue # Skip invalid entries
        if has_access:
            assigned_modules_for_this_group.append(module_name)
    
    logger.info(f"Group '{group_name}' will be granted access to modules: {assigned_modules_for_this_group}")

    # Use the utility function to update and save permissions
    # This function updates the in-memory MODULE_GROUP_MAPPING and saves it to all standard files.
    success, message = set_modules_for_group(group_name, assigned_modules_for_this_group)

    if success:
        logger.info(f"Module permissions successfully updated for group '{group_name}'.")
        # Get the latest state of the entire mapping to return
        current_mapping = get_module_permissions()
        return Response({
            "message": message,
            "updated_mapping": current_mapping
        })
    else:
        logger.error(f"Failed to update module permissions for group '{group_name}'. Message: {message}")
        # Even if saving failed, the in-memory map might have changed. 
        # Optionally, reload from files to ensure consistency or trust the error message.
        # For now, return an error based on the save operation's success.
        return Response({
            "error": f"Failed to update permissions. {message}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)