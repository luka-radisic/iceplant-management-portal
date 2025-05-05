#!/usr/bin/env python
"""
Test script to verify API connectivity and permissions after the fixes.
This script will:
1. Try to access the group management endpoints
2. Verify that the maintenance dashboard is accessible
3. Check permission configurations

Usage:
docker-compose exec backend python /app/verify_api_connectivity.py
"""

import os
import sys
import json
import requests
from django.conf import settings
from django.contrib.auth.models import User, Group
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

# Initialize Django (will be used when running inside the Docker container)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iceplant.settings')

try:
    import django
    django.setup()
except ImportError:
    print("This script is meant to be run inside the Docker container.")
    sys.exit(1)

def get_admin_token():
    """Get or create an auth token for an admin user"""
    try:
        # Try to get the administrator user
        admin_user = User.objects.get(username='administrator')
        
        # Get or create token
        token, created = Token.objects.get_or_create(user=admin_user)
        return token.key
    except User.DoesNotExist:
        print("Error: Administrator user not found!")
        return None
    except Exception as e:
        print(f"Error getting admin token: {str(e)}")
        return None

def run_api_tests():
    """Run tests against API endpoints to verify connectivity and permissions"""
    # Get admin token
    admin_token = get_admin_token()
    if not admin_token:
        print("Cannot proceed without admin token")
        return False
    
    # Create API client with admin token
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Token {admin_token}')
    
    print("\n=== Testing Group Management API ===")
    
    # Test GET /api/users/groups/
    try:
        response = client.get('/api/users/groups/')
        if response.status_code == 200:
            print(f"✅ GET /api/users/groups/ - Success (Status: {response.status_code})")
            print(f"  Found {len(response.data)} groups")
        else:
            print(f"❌ GET /api/users/groups/ - Failed (Status: {response.status_code})")
            print(f"  Response: {response.data}")
    except Exception as e:
        print(f"❌ GET /api/users/groups/ - Exception: {str(e)}")
    
    # Test GET /api/users/module-permissions/
    try:
        response = client.get('/api/users/module-permissions/')
        if response.status_code == 200:
            print(f"✅ GET /api/users/module-permissions/ - Success (Status: {response.status_code})")
            print(f"  Found modules: {', '.join(response.data.keys())}")
        else:
            print(f"❌ GET /api/users/module-permissions/ - Failed (Status: {response.status_code})")
            print(f"  Response: {response.data}")
    except Exception as e:
        print(f"❌ GET /api/users/module-permissions/ - Exception: {str(e)}")
    
    print("\n=== Testing Maintenance API ===")
    
    # Test GET /api/maintenance/dashboard/
    try:
        response = client.get('/api/maintenance/dashboard/')
        if response.status_code == 200:
            print(f"✅ GET /api/maintenance/dashboard/ - Success (Status: {response.status_code})")
            print(f"  Dashboard data contains: {', '.join(response.data.keys())}")
        else:
            print(f"❌ GET /api/maintenance/dashboard/ - Failed (Status: {response.status_code})")
            print(f"  Response: {response.data}")
    except Exception as e:
        print(f"❌ GET /api/maintenance/dashboard/ - Exception: {str(e)}")
    
    return True

if __name__ == "__main__":
    print("Verifying API connectivity and permissions...")
    run_api_tests()
    print("\nVerification completed.")
