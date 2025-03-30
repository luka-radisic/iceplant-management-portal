import os
from pathlib import Path

# Build path inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-key-placeholder'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'django_filters',
    
    # Local apps
    'attendance',
    'sales',
    'inventory',
    'expenses',
    'tools',
    'user_management',  # Add the new user management app
    'buyers',
    'companyconfig',  # Add company settings app
]

# Special code required for admin registration
ADMIN_REGISTRATION_CODE = 'iceplant-admin-2023'

# Media files (Uploaded files)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Ensure MEDIA_ROOT directory exists
os.makedirs(MEDIA_ROOT, exist_ok=True)
os.makedirs(os.path.join(MEDIA_ROOT, 'employee_photos'), exist_ok=True)

# Django REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 25,
    'PAGE_SIZE_QUERY_PARAM': 'page_size',
    'MAX_PAGE_SIZE': 200,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
}

# ... rest of the settings ... 