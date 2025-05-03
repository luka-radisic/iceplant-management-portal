# iceplant_core/urls.py

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from django.views.generic import TemplateView

urlpatterns = [
    # Django admin
    path('admin/', admin.site.urls),

    # Token login at the top level
    path('api-token-auth/', include('iceplant_core.api.urls')),  # we’ll route to obtain_auth in the api/ urls

    # Mount *all* your real API endpoints under /api/
    path('api/', include('iceplant_core.api.urls')),

    # Serve media & static in dev
    re_path(r'^media/(?P<path>.*)$',  serve, {'document_root': settings.MEDIA_ROOT}),
    re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.STATIC_ROOT}),
]

if settings.DEBUG:
    # Django Debug Toolbar
    try:
        import debug_toolbar
        urlpatterns = [ path('__debug__/', include(debug_toolbar.urls)) ] + urlpatterns
    except ImportError:
        pass

# Catch-all for React router (must come *after* /admin/, /api/, etc)
urlpatterns += [
    re_path(
        r'^(?!(api|admin|api-token-auth|media|static|__debug__)).*$',
        TemplateView.as_view(template_name='index.html'),
        name='react-app'
    ),
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
