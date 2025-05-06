"""
Final test of module permissions API endpoint.
"""

import os
import sys
import django
import json
import logging
import requests

# Set up Django environment
sys.path.append("/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "iceplant_core.settings")
django.setup()

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

def test_api_endpoint():
    """Test the module permissions API endpoint"""
    from django.contrib.auth.models import Group, User, Permission
    
    # 1. Use the Test Group
    group_name = "Test Group"
    
    try:
        group = Group.objects.get(name=group_name)
    except Group.DoesNotExist:
        group = Group.objects.create(name=group_name)
        logger.info(f"Created group {group_name}")
    
    # 2. Get API token 
    try:
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            logger.error("No admin user found")
            return
        
        from rest_framework.authtoken.models import Token
        token, _ = Token.objects.get_or_create(user=admin_user)
        headers = {"Authorization": f"Token {token.key}"}
    except Exception as e:
        logger.error(f"Error getting token: {e}")
        return
    
    # 3. Check initial permissions
    initial_perms = group.permissions.filter(content_type__app_label="buyers")
    logger.info(f"Initial buyers permissions: {initial_perms.count()}")
    
    # 4. Add buyers module via API
    try:
        logger.info("Adding buyers module to Test Group")
        modules_data = {
            "group_name": group_name,
            "modules": {
                "buyers": True
            }
        }
        
        response = requests.post(
            "http://localhost:8000/api/users/update-group-modules/",
            json=modules_data,
            headers=headers
        )
        
        if response.status_code == 200:
            logger.info("API call successful")
            logger.info(json.dumps(response.json(), indent=2))
        else:
            logger.error(f"API call failed: {response.status_code}")
            logger.error(response.text)
            return
    except Exception as e:
        logger.error(f"Error in API call: {e}")
        return
    
    # 5. Verify buyers permissions were added
    group = Group.objects.get(name=group_name)  # Reload group
    buyers_perms = group.permissions.filter(content_type__app_label="buyers")
    logger.info(f"Buyers permissions after adding: {buyers_perms.count()}")
    
    for perm in buyers_perms:
        logger.info(f"  - {perm.content_type.app_label}.{perm.codename}")
    
    # 6. Remove buyers module via API
    try:
        logger.info("Removing buyers module from Test Group")
        modules_data = {
            "group_name": group_name,
            "modules": {
                "buyers": False
            }
        }
        
        response = requests.post(
            "http://localhost:8000/api/users/update-group-modules/",
            json=modules_data,
            headers=headers
        )
        
        if response.status_code == 200:
            logger.info("API call successful")
            logger.info(json.dumps(response.json(), indent=2))
        else:
            logger.error(f"API call failed: {response.status_code}")
            logger.error(response.text)
            return
    except Exception as e:
        logger.error(f"Error in API call: {e}")
        return
    
    # 7. Verify buyers permissions were removed
    group = Group.objects.get(name=group_name)  # Reload group
    buyers_perms = group.permissions.filter(content_type__app_label="buyers")
    logger.info(f"Buyers permissions after removal: {buyers_perms.count()}")
    
    if buyers_perms.count() > 0:
        for perm in buyers_perms:
            logger.error(f"  - {perm.content_type.app_label}.{perm.codename}")
    else:
        logger.info("SUCCESS: All buyers permissions removed correctly!")
    
if __name__ == "__main__":
    logger.info("Testing module permissions API endpoint...")
    test_api_endpoint()
    logger.info("Done!")
