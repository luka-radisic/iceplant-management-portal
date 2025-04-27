# Docker Fresh Start Guide

This guide provides instructions for completely resetting your Docker environment for the IcePlant Management Portal, especially useful when debugging stubborn issues like the Django Debug Toolbar errors.

## Quick Reset Instructions

```bash
# Stop all containers and remove volumes, images
docker compose down --rmi all --volumes --remove-orphans

# Rebuild and start fresh
docker compose up --build
```

## Step-by-Step Fresh Start (With Debug Toolbar Fix)

### 1. Stop and Clean Everything

```bash
# Stop all containers
docker compose down

# Remove all related volumes
docker compose down --volumes

# Remove all related images
docker compose down --rmi all

# Make sure to remove orphaned containers too
docker compose down --remove-orphans
```

### 2. Fix Django Debug Toolbar Issue

The error `django.urls.exceptions.NoReverseMatch: 'djdt' is not a registered namespace` indicates the Django Debug Toolbar isn't properly configured. Before rebuilding, apply these fixes to your code:

1. First, fix your URLs configuration:

```bash
# Open the URLs configuration file
nano iceplant_portal/iceplant_core/urls.py
```

Make sure you have the following at the TOP of your urlpatterns:

```python
urlpatterns = [
    # Django Debug Toolbar - must be at the top
    path('__debug__/', include('debug_toolbar.urls')),
    
    # Rest of your URLs...
    # ...
]
```

2. Next, update your settings.py:

```bash
# Open the settings file
nano iceplant_portal/iceplant_core/settings.py
```

Add this to your settings:

```python
# Debug Toolbar Settings
DEBUG_TOOLBAR_CONFIG = {
    'SHOW_TOOLBAR_CALLBACK': lambda request: DEBUG,
}

# Make sure debug_toolbar is in INSTALLED_APPS
if DEBUG:
    try:
        import debug_toolbar
        INSTALLED_APPS.append('debug_toolbar')
        
        # Insert the toolbar middleware at the right position
        if 'debug_toolbar.middleware.DebugToolbarMiddleware' not in MIDDLEWARE:
            middleware_insertion_point = MIDDLEWARE.index('django.middleware.common.CommonMiddleware')
            MIDDLEWARE.insert(middleware_insertion_point, 'debug_toolbar.middleware.DebugToolbarMiddleware')
    except ImportError:
        pass
```

3. Update your requirements.txt to include django-debug-toolbar:

```
django-debug-toolbar==4.3.0
```

### 3. Rebuild with the Fixed Code

```bash
# Build fresh Docker images with our fixes
docker compose build --no-cache

# Start containers
docker compose up
```

### 4. Verify Debug Toolbar Works

Visit http://localhost:8000/admin/ and you should no longer see the "djdt is not a registered namespace" error.

## Troubleshooting StatReloader Issues

If you're having issues with StatReloader not picking up changes correctly:

1. Make sure Docker volumes are properly mounting your code:

```yaml
# In docker-compose.yml, check your volume mounts
volumes:
  - ./iceplant_portal:/app/iceplant_portal
```

2. Sometimes you need to rebuild instead of relying on StatReloader:

```bash
# If changes aren't being picked up, try:
docker compose restart
```

3. For stubborn debug_toolbar issues, you can disable it temporarily:

```python
# In settings.py:
DEBUG_TOOLBAR_CONFIG = {
    'SHOW_TOOLBAR_CALLBACK': lambda request: False,
}
```

## Further Debugging

If you're still encountering issues after a fresh start:

1. Check container logs:
```bash
docker compose logs -f
```

2. Inspect the container directly:
```bash
docker exec -it iceplant-portal bash
cd /app/iceplant_portal
python -c "import sys; print(sys.path)"
```

3. Verify the debug_toolbar installation:
```bash
docker exec -it iceplant-portal bash
pip show django-debug-toolbar
```