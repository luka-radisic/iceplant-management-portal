from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token
from .views import public_company_info, CustomObtainAuthToken

urlpatterns = [
    path('api-token-auth/', obtain_auth_token, name='api-token-auth'),
    # or if you’re using the custom view:
    # path('api-token-auth/', CustomObtainAuthToken.as_view(), name='api-token-auth'),
    path('api/company-info/', public_company_info, name='company-info'),
    # any other core endpoints…
]
