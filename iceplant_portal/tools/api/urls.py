from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ToolsViewSet

router = DefaultRouter()
router.register(r'tools', ToolsViewSet, basename='tools')

urlpatterns = [
    path('', include(router.urls)),
]
