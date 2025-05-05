"""
Check API URLs in the project
"""

import os
import sys
import django

# Set up Django environment
sys.path.append("/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "iceplant_core.settings")
django.setup()

from django.urls import get_resolver

def print_urls():
    """Print all URLs in the project"""
    resolver = get_resolver(None)
    
    for pattern in resolver.url_patterns:
        if hasattr(pattern, "url_patterns"):
            # This is an included URLconf
            print(f"URLconf: {getattr(pattern, 'app_name', '')}")
            for url in pattern.url_patterns:
                print(f"  - {url}")

if __name__ == "__main__":
    print_urls()
