# iceplant_core/api/urls.py

from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token
from .views import CustomObtainAuthToken, public_company_info

urlpatterns = [
    # ←--- your ONE token endpoint:
    path('api-token-auth/', CustomObtainAuthToken.as_view(), name='api-token-auth'),

    # ←--- standalone company info:
    path('company-info/', public_company_info, name='company-info'),

    # ←--- then all the rest of your apps under /api/.../
    path('attendance/',   include('attendance.api.urls')),
    path('sales/',        include('sales.urls')),
    path('company/',      include('companyconfig.urls')),   # if you still need companyconfig urls
    path('inventory/',    include('inventory.api.urls')),
    path('expenses/',     include('expenses.api.urls')),
    path('tools/',        include('tools.api.urls')),
    path('buyers/',       include('buyers.api.urls')),
    path('maintenance/',  include('maintenance.urls')),

    # optional DRF login for browsable API
    path('api-auth/', include('rest_framework.urls')),
]
