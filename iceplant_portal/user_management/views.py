from django.shortcuts import render
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.conf import settings
from rest_framework import status, viewsets, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.views import APIView
from .serializers import UserSerializer, UserCreateSerializer, PermissionSerializer, RoleSerializer, RolePermissionSerializer, UserRoleSerializer
from .models import UserPermission, UserRole, RolePermission, UserRoleAssignment

# Custom token auth view that returns more user details
class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': {
                'id': user.pk,
                'username': user.username,
                'email': user.email,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser
            }
        })

# Custom permission that only allows admins to access
class IsAdminUser(permissions.BasePermission):
    """
    Permission to only allow admin users to access the API.
    """
    def has_permission(self, request, view):
        return request.user and (request.user.is_staff or request.user.is_superuser)

# Admin-only user management viewset
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    @action(detail=True, methods=['get'])
    def permissions(self, request, pk=None):
        """
        Get permissions for a user
        """
        user = self.get_object()
        user_permissions = UserPermission.objects.filter(user=user)
        serializer = PermissionSerializer(user_permissions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def roles(self, request, pk=None):
        """
        Get roles for a user
        """
        user = self.get_object()
        user_roles = UserRoleAssignment.objects.filter(user=user)
        serializer = UserRoleSerializer(user_roles, many=True)
        return Response(serializer.data)

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        # Handle password update separately
        password = request.data.get('password')
        if password:
            instance.set_password(password)
        
        self.perform_update(serializer)
        return Response(serializer.data)

# Registration view accessible to all
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_user(request):
    # Check if username already exists
    username = request.data.get('username')
    if User.objects.filter(username=username).exists():
        return Response(
            {"detail": f"User with username '{username}' already exists"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    serializer = UserCreateSerializer(data=request.data)
    if serializer.is_valid():
        # Check if admin code is provided and valid
        admin_code = request.data.get('admin_code')
        is_admin = False
        
        if admin_code:
            if admin_code == getattr(settings, 'ADMIN_REGISTRATION_CODE', 'admin-secret'):
                is_admin = True
            else:
                return Response(
                    {"detail": "Invalid admin code provided"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Create user
        try:
            user = serializer.save()
            
            # Set admin permissions if admin code was valid
            if is_admin:
                user.is_staff = True
                user.save()
            
            # Create token for the new user
            token, _ = Token.objects.get_or_create(user=user)
                
            return Response({
                "detail": "User registered successfully",
                "token": token.key,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "is_staff": user.is_staff,
                    "is_superuser": user.is_superuser
                }
            }, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Permission viewset
class PermissionViewSet(viewsets.ModelViewSet):
    queryset = UserPermission.objects.all().order_by('user__username', 'permission_type')
    serializer_class = PermissionSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    @action(detail=False, methods=['get'])
    def types(self, request):
        """
        Get all permission types
        """
        permission_types = [
            {'value': p[0], 'display': p[1]} 
            for p in UserPermission.PERMISSION_TYPES
        ]
        return Response(permission_types)

# Role viewset
class RoleViewSet(viewsets.ModelViewSet):
    queryset = UserRole.objects.all().order_by('name')
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    @action(detail=True, methods=['get'])
    def permissions(self, request, pk=None):
        """
        Get permissions for a role
        """
        role = self.get_object()
        role_permissions = RolePermission.objects.filter(role=role)
        serializer = RolePermissionSerializer(role_permissions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def users(self, request, pk=None):
        """
        Get users with this role
        """
        role = self.get_object()
        role_assignments = UserRoleAssignment.objects.filter(role=role)
        serializer = UserRoleSerializer(role_assignments, many=True)
        return Response(serializer.data)

# Role Permission viewset
class RolePermissionViewSet(viewsets.ModelViewSet):
    queryset = RolePermission.objects.all().order_by('role__name', 'permission_type')
    serializer_class = RolePermissionSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

# User Role Assignment viewset
class UserRoleViewSet(viewsets.ModelViewSet):
    queryset = UserRoleAssignment.objects.all().order_by('user__username', 'role__name')
    serializer_class = UserRoleSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def create(self, request, *args, **kwargs):
        """
        Create a user role assignment and set the assigned_by field
        """
        # Add the current user as assigned_by
        request.data['assigned_by'] = request.user.id
        return super().create(request, *args, **kwargs)

# User profile endpoint
@api_view(['GET', 'PUT'])
@permission_classes([permissions.IsAuthenticated])
def user_profile(request):
    """
    Get or update the current user's profile
    """
    user = request.user
    
    if request.method == 'GET':
        serializer = UserSerializer(user)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            # Handle password update separately
            password = request.data.get('password')
            if password:
                user.set_password(password)
                
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
