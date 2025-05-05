from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from rest_framework import viewsets, status
from rest_framework.decorators import action
from django.contrib.auth.models import User, Group
from django.shortcuts import get_object_or_404
from iceplant_core.group_permissions import IsInGroups
from .serializers import (
    GroupSerializer, 
    GroupDetailSerializer, 
    UserListSerializer, 
    UserGroupAssignmentSerializer
)

class GroupViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing groups.
    Only admins can access this viewset.
    """
    queryset = Group.objects.all().order_by('name')
    serializer_class = GroupSerializer
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated, IsInGroups(['Admins'])]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return GroupDetailSerializer
        return GroupSerializer
    
    @action(detail=True, methods=['post'])
    def add_users(self, request, pk=None):
        """Add users to this group"""
        group = self.get_object()
        user_ids = request.data.get('user_ids', [])
        
        added_users = []
        for user_id in user_ids:
            try:
                user = User.objects.get(id=user_id)
                user.groups.add(group)
                added_users.append(user.username)
            except User.DoesNotExist:
                pass
        
        return Response({
            'status': 'success',
            'message': f'Added {len(added_users)} users to group {group.name}',
            'added_users': added_users
        })
    
    @action(detail=True, methods=['post'])
    def remove_users(self, request, pk=None):
        """Remove users from this group"""
        group = self.get_object()
        user_ids = request.data.get('user_ids', [])
        
        removed_users = []
        for user_id in user_ids:
            try:
                user = User.objects.get(id=user_id)
                user.groups.remove(group)
                removed_users.append(user.username)
            except User.DoesNotExist:
                pass
        
        return Response({
            'status': 'success',
            'message': f'Removed {len(removed_users)} users from group {group.name}',
            'removed_users': removed_users
        })


class UserManagementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for managing users in the context of group assignments.
    Only admins can access this viewset.
    """
    queryset = User.objects.all().order_by('username')
    serializer_class = UserListSerializer
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated, IsInGroups(['Admins'])]
    
    @action(detail=False, methods=['post'])
    def assign_groups(self, request):
        """Assign groups to a user"""
        serializer = UserGroupAssignmentSerializer(data=request.data)
        
        if serializer.is_valid():
            user_id = serializer.validated_data['user_id']
            group_ids = serializer.validated_data.get('group_ids', [])
            
            try:
                user = User.objects.get(id=user_id)
                
                # Clear existing groups and add new ones
                user.groups.clear()
                
                added_groups = []
                for group_id in group_ids:
                    try:
                        group = Group.objects.get(id=group_id)
                        user.groups.add(group)
                        added_groups.append(group.name)
                    except Group.DoesNotExist:
                        pass
                
                return Response({
                    'status': 'success',
                    'message': f'Updated groups for user {user.username}',
                    'user': user.username,
                    'assigned_groups': added_groups
                })
            except User.DoesNotExist:
                return Response({
                    'status': 'error',
                    'message': 'User not found'
                }, status=status.HTTP_404_NOT_FOUND)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserPermissionsView(APIView):
    """
    API endpoint that returns the current user's permissions and access rights.
    This is useful for the frontend to customize the UI based on the user's permissions.
    """
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, format=None):
        user = request.user
        
        # Get user's groups
        groups = list(user.groups.values_list('name', flat=True))
        
        # Module access mapping based on groups
        module_access = {
            'attendance': any(group in ['HR', 'Managers', 'Admins'] for group in groups),
            'sales': any(group in ['Sales', 'Accounting', 'Managers', 'Admins'] for group in groups),
            'inventory': any(group in ['Inventory', 'Operations', 'Managers', 'Admins'] for group in groups),
            'expenses': any(group in ['Accounting', 'Finance', 'Managers', 'Admins'] for group in groups),
            'maintenance': any(group in ['Maintenance', 'Operations', 'Managers', 'Admins'] for group in groups),
            'buyers': any(group in ['Sales', 'Accounting', 'Managers', 'Admins'] for group in groups),
        }
        
        # Action permissions - determine what actions user can perform
        action_permissions = {
            # General user permissions
            'can_view_dashboard': True,  # Everyone can view the dashboard
            
            # Admin-specific permissions
            'can_manage_users': user.is_staff or user.is_superuser,
            'can_access_admin': user.is_staff or user.is_superuser,
            
            # Sales permissions
            'can_create_sales': module_access['sales'],
            'can_edit_sales': module_access['sales'],
            'can_delete_sales': any(group in ['Managers', 'Admins'] for group in groups) or user.is_superuser,
            
            # Inventory permissions
            'can_manage_inventory': module_access['inventory'],
            'can_adjust_stock': any(group in ['Inventory', 'Operations', 'Managers', 'Admins'] for group in groups),
            
            # HR permissions
            'can_manage_attendance': module_access['attendance'],
            'can_approve_attendance': any(group in ['HR', 'Managers', 'Admins'] for group in groups),
            
            # Maintenance permissions
            'can_view_maintenance': module_access['maintenance'],
            'can_schedule_maintenance': any(group in ['Maintenance', 'Operations', 'Managers', 'Admins'] for group in groups),
            'can_complete_maintenance': any(group in ['Maintenance', 'Operations', 'Managers', 'Admins'] for group in groups),
            
            # Finance permissions
            'can_manage_expenses': module_access['expenses'],
            'can_approve_expenses': any(group in ['Finance', 'Managers', 'Admins'] for group in groups),
        }
        
        return Response({
            'username': user.username,
            'email': user.email,
            'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
            'is_superuser': user.is_superuser,
            'is_staff': user.is_staff,
            'groups': groups,
            'module_access': module_access,
            'permissions': action_permissions,
        })
