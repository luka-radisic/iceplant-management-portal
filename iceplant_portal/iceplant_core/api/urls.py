# iceplant_core/api/urls.py

from django.urls import path, include
from companyconfig.views import public_company_info
from ..auth import CustomObtainAuthToken

urlpatterns = [    # your single token endpoint
    path('api-token-auth/', CustomObtainAuthToken.as_view(), name='api-token-auth'),

    # public company-info (imported straight from companyconfig)
    path('company-info/', public_company_info, name='company-info'),

    # then mount the rest under /api/
    path('attendance/',   include('attendance.api.urls')),
    path('sales/',        include('sales.urls')),
    path('company/',      include('companyconfig.urls')),  # if you still need those
    path('inventory/',    include('inventory.api.urls')),
    path('expenses/',     include('expenses.api.urls')),
    path('tools/',        include('tools.api.urls')),
    path('buyers/',       include('buyers.api.urls')),
    path('maintenance/',  include('maintenance.urls')),
    path('users/',        include('users.urls')),

    # optional DRF browsable‐API login
    path('api-auth/',     include('rest_framework.urls')),
]
