from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AttendanceViewSet, ImportLogViewSet

router = DefaultRouter()
router.register(r'attendance', AttendanceViewSet)
router.register(r'import-logs', ImportLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
] 