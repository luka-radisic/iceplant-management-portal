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
from companyconfig.views import public_company_info
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from rest_framework.authtoken.views import ObtainAuthToken
from django.views.static import serve

# Import our custom auth token view
from .auth import CustomObtainAuthToken

urlpatterns = [
    # Give api-token-auth highest precedence for debugging
    path('api-token-auth/', CustomObtainAuthToken.as_view(), name='api_token_auth'),

    path('admin/', admin.site.urls),
    # API endpoints
    path('api/attendance/', include('attendance.api.urls')),
    path('api/sales/', include('sales.urls')),
    path('api/company/', include('companyconfig.urls')),
    path('api/inventory/', include('inventory.api.urls')),
    path('api/expenses/', include('expenses.api.urls')),
    path('api/tools/', include('tools.api.urls')),
    path('api/buyers/', include('buyers.api.urls')),
    path('api/maintenance/', include('maintenance.urls')),
    path('api-auth/', include('rest_framework.urls')),
    
    # Serve media files directly
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.STATIC_ROOT}),
    
    # Explicit company info endpoint
    path('api/company-info/', public_company_info, name='company-info'),
]

# Add Django Debug Toolbar URLs if in debug mode and the toolbar is installed
if settings.DEBUG:
    try:
        import debug_toolbar
        urlpatterns = [
            path('__debug__/', include('debug_toolbar.urls')),
        ] + urlpatterns
    except ImportError:
        pass

# Frontend routes - Must be after all API routes
# Catch all non-API URLs and serve index.html
urlpatterns += [
    re_path(r'^(?!(api|admin|api-token-auth|api-auth|media|static|__debug__)).*$', 
            TemplateView.as_view(template_name='index.html'), name='react-app'),
    
    # Keep the root path explicitly for home
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
]

# Serve media and static files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
