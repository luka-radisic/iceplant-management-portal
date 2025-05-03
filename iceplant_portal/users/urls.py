from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, register_user
from .api_views import UserPermissionsView
from .api_views_groups import GroupViewSet, UserManagementViewSet, module_group_mapping

# Create a router for the user views
user_router = DefaultRouter()
user_router.register(r'users', UserViewSet)

# Create a router for the group management views
groups_router = DefaultRouter()
groups_router.register(r'groups', GroupViewSet)
groups_router.register(r'user-management', UserManagementViewSet)

urlpatterns = [
    # Include the original user endpoints
    path('', include(user_router.urls)),
    path('register/', register_user, name='register'),
    path('me/permissions/', UserPermissionsView.as_view(), name='user-permissions'),
    
    # Include the new group management endpoints
    path('', include(groups_router.urls)),
    path('module-permissions/', module_group_mapping, name='module-permissions'),
]
