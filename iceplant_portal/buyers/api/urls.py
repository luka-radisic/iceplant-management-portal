from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BuyerViewSet

router = DefaultRouter()
router.register(r'buyers', BuyerViewSet)

urlpatterns = [
    path('', include(router.urls)),
] 