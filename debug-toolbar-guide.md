# Django Debug Toolbar Troubleshooting Guide

This guide helps diagnose and fix common issues with Django Debug Toolbar in the IcePlant Management Portal.

## Common Debug Toolbar Errors

### `NoReverseMatch: 'djdt' is not a registered namespace`

This error occurs when Django Debug Toolbar URLs aren't properly configured in your project.

**Solution:**
1. Ensure the debug toolbar URL patterns are included in your `urls.py`:
   ```python
   # In iceplant_core/urls.py
   if settings.DEBUG:
       import debug_toolbar
       urlpatterns = [
           path('__debug__/', include('debug_toolbar.urls')),
       ] + urlpatterns
   ```

2. Make sure the debug toolbar is properly installed:
   ```bash
   pip install django-debug-toolbar
   ```

3. Check that debug toolbar is in your INSTALLED_APPS:
   ```python
   if DEBUG:
       try:
           import debug_toolbar
           INSTALLED_APPS.append('debug_toolbar')
       except ImportError:
           pass
   ```

### Debug Toolbar Not Showing

If the debug toolbar is installed but not appearing on your pages:

**Solution:**
1. Verify `DEBUG = True` in your settings
2. Check that your IP is in `INTERNAL_IPS`:
   ```python
   INTERNAL_IPS = ['127.0.0.1', 'localhost']
   ```
3. Ensure the middleware is in the correct order:
   ```python
   MIDDLEWARE = [
       # ... other middleware
       'debug_toolbar.middleware.DebugToolbarMiddleware',
       # ... other middleware
   ]
   ```
4. Set up a custom show toolbar callback:
   ```python
   DEBUG_TOOLBAR_CONFIG = {
       'SHOW_TOOLBAR_CALLBACK': lambda request: True if DEBUG else False,
   }
   ```

### Static Files Not Loading for Debug Toolbar

If the debug toolbar appears but looks unstyled or broken:

**Solution:**
1. Check your STATICFILES_DIRS setting
2. Verify that `django.contrib.staticfiles` is in your INSTALLED_APPS
3. Run `python manage.py collectstatic` to ensure all static files are collected

## Advanced Debug Toolbar Configuration

### Custom Panel Configuration

```python
DEBUG_TOOLBAR_PANELS = [
    'debug_toolbar.panels.versions.VersionsPanel',
    'debug_toolbar.panels.timer.TimerPanel',
    'debug_toolbar.panels.settings.SettingsPanel',
    'debug_toolbar.panels.headers.HeadersPanel',
    'debug_toolbar.panels.request.RequestPanel',
    'debug_toolbar.panels.sql.SQLPanel',
    'debug_toolbar.panels.staticfiles.StaticFilesPanel',
    'debug_toolbar.panels.templates.TemplatesPanel',
    'debug_toolbar.panels.cache.CachePanel',
    'debug_toolbar.panels.signals.SignalsPanel',
    'debug_toolbar.panels.logging.LoggingPanel',
    'debug_toolbar.panels.redirects.RedirectsPanel',
    'debug_toolbar.panels.profiling.ProfilingPanel',
]
```

### Setting the Debug Toolbar Position

```python
DEBUG_TOOLBAR_CONFIG = {
    'SHOW_TOOLBAR_CALLBACK': lambda request: DEBUG,
    'RESULTS_CACHE_SIZE': 3,
    'RENDER_PANELS': True,
    'POSITION': 'right',  # Can be 'left', 'right', 'top', 'bottom'
}
```

## Disabling Django Debug Toolbar

If you need to temporarily disable the debug toolbar without removing it:

1. In settings.py, add:
   ```python
   DEBUG_TOOLBAR_CONFIG = {
       'SHOW_TOOLBAR_CALLBACK': lambda request: False,
   }
   ```

2. Or set an environment variable:
   ```bash
   export DISABLE_DEBUG_TOOLBAR=1
   ```
   
   And in settings.py:
   ```python
   DEBUG_TOOLBAR_CONFIG = {
       'SHOW_TOOLBAR_CALLBACK': lambda request: DEBUG and not os.environ.get('DISABLE_DEBUG_TOOLBAR'),
   }
   ```

## Additional Resources

- [Official Django Debug Toolbar Documentation](https://django-debug-toolbar.readthedocs.io/)
- [GitHub Repository](https://github.com/jazzband/django-debug-toolbar)