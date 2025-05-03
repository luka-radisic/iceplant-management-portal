# iceplant_core/urls.py

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.views.static import serve

urlpatterns = [
    # Core API (token-auth, company-info, any future core endpoints)
    path('', include('iceplant_core.api.urls')),

    # App-specific API endpoints
    path('api/attendance/',   include('attendance.api.urls')),
    path('api/sales/',        include('sales.urls')),
    path('api/company/',      include('companyconfig.urls')),
    path('api/inventory/',    include('inventory.api.urls')),
    path('api/expenses/',     include('expenses.api.urls')),
    path('api/tools/',        include('tools.api.urls')),
    path('api/buyers/',       include('buyers.api.urls')),
    path('api/maintenance/',  include('maintenance.urls')),

    # DRF browsable-api login/logout
    path('api-auth/', include('rest_framework.urls')),

    # Django admin
    path('admin/', admin.site.urls),

    # Serve media & static (when DEBUG=False you’ll typically let nginx handle this)
    re_path(r'^media/(?P<path>.*)$',  serve, {'document_root': settings.MEDIA_ROOT}),
    re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.STATIC_ROOT}),
]

# Debug toolbar
if settings.DEBUG:
    try:
        import debug_toolbar
        urlpatterns = [path('__debug__/', include(debug_toolbar.urls))] + urlpatterns
    except ImportError:
        pass

# React SPA catch-all (must come after all API/static routes)
urlpatterns += [
    re_path(
        r'^(?!(api|admin|api-token-auth|api-auth|media|static|__debug__)).*$',
        TemplateView.as_view(template_name='index.html'),
        name='react-app'
    ),
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
]

# Serve media & static in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL,  document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
