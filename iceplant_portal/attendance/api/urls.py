from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AttendanceViewSet,
    ImportLogViewSet,
    EmployeeShiftViewSet,
    DepartmentShiftViewSet,
    EmployeeProfileViewSet
)

router = DefaultRouter()
router.register(r'attendance', AttendanceViewSet, basename='attendance')
router.register(r'import-logs', ImportLogViewSet, basename='import-logs')
router.register(r'employee-shift', EmployeeShiftViewSet, basename='employee-shift')
router.register(r'department-shift', DepartmentShiftViewSet, basename='department-shift')
router.register(r'employee-profile', EmployeeProfileViewSet, basename='employee-profile')

urlpatterns = [
    path('', include(router.urls)),
] 