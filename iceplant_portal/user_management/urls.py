from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create a router for viewsets
router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'permissions', views.PermissionViewSet)
router.register(r'roles', views.RoleViewSet)
router.register(r'role-permissions', views.RolePermissionViewSet)
router.register(r'user-roles', views.UserRoleViewSet)

urlpatterns = [
    # Include the router URLs
    path('', include(router.urls)),
    
    # Registration endpoint
    path('register/', views.RegisterView.as_view(), name='register'),
    path('profile/', views.user_profile, name='profile'),
] 