from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create a router for viewsets
router = DefaultRouter()
router.register(r'users', views.UserViewSet)

urlpatterns = [
    # Include the router URLs
    path('', include(router.urls)),
    
    # Registration endpoint
    path('register/', views.register_user, name='register'),
] 