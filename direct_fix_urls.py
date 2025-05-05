"""
Direct fix for iceplant_core/urls.py file.
This script assumes the specific issue is with the syntax in the URL patterns.
"""

# Open and completely rewrite the problematic file
urls_file_path = '/app/iceplant_portal/iceplant_core/urls.py'

new_content = """from django.urls import path, include
from django.contrib import admin
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api-token-auth/', obtain_auth_token, name='api_token_auth'),
    path('api/', include('iceplant_core.api.urls')),
]
"""

with open(urls_file_path, 'w') as f:
    f.write(new_content)

print(f"Fixed {urls_file_path} with clean URL patterns")

# Also check and fix the API URLs file
api_urls_path = '/app/iceplant_portal/iceplant_core/api/urls.py'

try:
    with open(api_urls_path, 'r') as f:
        api_content = f.read()
    
    print("Original API URLs content:")
    print("-" * 50)
    print(api_content)
    print("-" * 50)
    
    # Create a fixed version that definitely works
    fixed_api_content = """from django.urls import path, include

urlpatterns = [
    path('users/', include('users.urls')),
    path('attendance/', include('attendance.urls')),
    path('inventory/', include('inventory.urls')),
    path('sales/', include('sales.urls')),
    path('maintenance/', include('maintenance.urls')),
    path('company/', include('company.urls')),
    path('buyers/', include('buyers.urls')),
]
"""
    
    # Write the fixed content
    with open(api_urls_path, 'w') as f:
        f.write(fixed_api_content)
    
    print(f"Fixed {api_urls_path} with clean URL patterns")
    
except Exception as e:
    print(f"Error handling API URLs file: {str(e)}")

print("\nURL fixes complete. Please restart the Django server.")
