from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompanySettingsViewSet, public_company_info

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'settings', CompanySettingsViewSet, basename='company-settings')

# The API URLs are determined automatically by the router
urlpatterns = [
    path('', include(router.urls)),
    path('public-info/', public_company_info, name='public-company-info'),
]

from .views import DatabaseDeleteAPIView

urlpatterns += [
    path('admin-tools/delete-data/', DatabaseDeleteAPIView.as_view(), name='delete-database-data'),
]