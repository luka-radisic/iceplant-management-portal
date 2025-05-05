"""
Test the API endpoints used by the Group Management page.
"""

import os
import sys
import django
import json
import logging
import requests
from django.contrib.auth import get_user_model

# Set up Django environment
sys.path.append("/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "iceplant_core.settings")
django.setup()

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

def test_group_management_api():
    """Test the API endpoints used by the Group Management page"""
    from django.contrib.auth.models import Group, User
    
    logger.info("Testing Group Management API...")
    
    # Get or create admin user for testing
    User = get_user_model()
    try:
        admin = User.objects.get(username="admin")
    except User.DoesNotExist:
        admin = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="adminpassword"
        )
        logger.info("Created admin user")
    
    # Get token for API authentication
    from rest_framework.authtoken.models import Token
    token, _ = Token.objects.get_or_create(user=admin)
    headers = {"Authorization": f"Token {token.key}"}
    
    logger.info(f"Using token: {token.key}")
    
    # Base URL for the API
    BASE_URL = "http://localhost:8000/api"
    
    # 1. Test getting the list of groups
    groups_url = f"{BASE_URL}/users/groups/"
    logger.info(f"Testing GET {groups_url}")
    try:
        response = requests.get(groups_url, headers=headers)
        response.raise_for_status()
        logger.info(f"Success! Status code: {response.status_code}")
        logger.info(f"Groups: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        logger.error(f"Error: {e}")
    
    # 2. Test getting the module mapping
    # Use the correct endpoint name
    mapping_url = f"{BASE_URL}/users/module-permissions/"
    logger.info(f"Testing GET {mapping_url}")
    try:
        response = requests.get(mapping_url, headers=headers)
        response.raise_for_status()
        logger.info(f"Success! Status code: {response.status_code}")
        logger.info(f"Module mapping: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        logger.error(f"Error: {e}")
    
    # 3. Test updating module permissions for a group
    update_url = f"{BASE_URL}/users/update-group-modules/"
    test_group_name = "ModuleTest"
    logger.info(f"Testing POST {update_url}")
    data = {
        "group_name": test_group_name,
        "modules": {
            "inventory": True,
            "sales": True,
            "attendance": False,
            "expenses": False,
            "maintenance": False,
            "buyers": False
        }
    }
    try:
        response = requests.post(update_url, json=data, headers=headers)
        response.raise_for_status()
        logger.info(f"Success! Status code: {response.status_code}")
        logger.info(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        logger.error(f"Error: {e}")

if __name__ == "__main__":
    try:
        test_group_management_api()
        logger.info("Tests completed successfully")
    except Exception as e:
        logger.error(f"Test failed: {e}")
