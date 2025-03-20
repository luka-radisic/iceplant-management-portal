from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InventoryViewSet, InventoryAdjustmentViewSet

router = DefaultRouter()
router.register(r'inventory', InventoryViewSet)
router.register(r'inventory-adjustments', InventoryAdjustmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
] 