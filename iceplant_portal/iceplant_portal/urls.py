from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Authentication endpoints
    path('api-token-auth/', obtain_auth_token, name='api_token_auth'),
    path('api/register/', include('user_management.urls')),  # Registration endpoint
    path('api/users/', include('user_management.urls')),    # User management endpoints
    
    # API endpoints for other apps
    path('api/attendance/', include('attendance.api.urls')),
    path('api/sales/', include('sales.api.urls')),
    path('api/inventory/', include('inventory.api.urls')),
    path('api/expenses/', include('expenses.api.urls')),
    path('api/tools/', include('tools.api.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) 