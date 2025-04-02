from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MaintenanceItemViewSet, MaintenanceRecordViewSet

router = DefaultRouter()
router.register(r'items', MaintenanceItemViewSet, basename='maintenanceitem')
router.register(r'records', MaintenanceRecordViewSet, basename='maintenancerecord')

urlpatterns = [
    path('', include(router.urls)),
] 