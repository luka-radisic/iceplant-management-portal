# iceplant_core/api/urls.py

from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token
from .views import CustomObtainAuthToken, public_company_info

urlpatterns = [
    # Token endpoints
    path('api-token-auth/', CustomObtainAuthToken.as_view(), name='api-token-auth'),
    # Company info
    path('company-info/', public_company_info, name='company-info'),

    # Your app endpoints
    path('attendance/', include('attendance.api.urls')),
    path('sales/',      include('sales.urls')),
    path('company/',    include('companyconfig.urls')),
    path('inventory/',  include('inventory.api.urls')),
    path('expenses/',   include('expenses.api.urls')),
    path('tools/',      include('tools.api.urls')),
    path('buyers/',     include('buyers.api.urls')),
    path('maintenance/',include('maintenance.urls')),

    # DRF’s browsable-API login/logout
    path('api-auth/', include('rest_framework.urls')),
]
