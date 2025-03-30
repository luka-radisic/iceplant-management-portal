"""
URL configuration for iceplant_core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from user_management.views import register_user, CustomAuthToken

urlpatterns = [
    path('admin/', admin.site.urls),
    # API endpoints
    path('api/attendance/', include('attendance.api.urls')),
    path('api/sales/', include('sales.api.urls')),
    path('api/inventory/', include('inventory.api.urls')),
    path('api/expenses/', include('expenses.api.urls')),
    path('api/tools/', include('tools.api.urls')),
    path('api/buyers/', include('buyers.api.urls')),
    path('api-auth/', include('rest_framework.urls')),
    path('api-token-auth/', CustomAuthToken.as_view(), name='api_token_auth'),
    
    # User management endpoints
    path('api/register/', register_user, name='register'),
    path('api/users/', include('user_management.urls')),
    
    # Frontend routes - Catch all non-API URLs and serve index.html
    # Use re_path to ensure API routes are not caught by this
    re_path(r'^(?!api/).*$', TemplateView.as_view(template_name='index.html'), name='react-app'),
    # Keep the root path explicitly for home
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
]

# Serve media and static files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
