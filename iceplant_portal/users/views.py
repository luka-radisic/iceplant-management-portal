from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.conf import settings
from rest_framework import status, viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .serializers import UserSerializer, UserCreateSerializer

# Custom permission that only allows admins to access
class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and (request.user.is_staff or request.user.is_superuser))

# Admin-only user management viewset
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
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
                
            return Response(
                {"detail": "User registered successfully"}, 
                status=status.HTTP_201_CREATED
            )
        except ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST) 