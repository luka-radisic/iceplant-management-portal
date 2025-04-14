"""
This script verifies that the imports in add_missing_days_endpoint.py can be imported correctly.
"""
try:
    from rest_framework.decorators import action
    print("✓ Successfully imported action from rest_framework.decorators")
except ImportError as e:
    print(f"✗ Failed to import action: {e}")

try:
    from rest_framework.parsers import JSONParser
    print("✓ Successfully imported JSONParser from rest_framework.parsers")
except ImportError as e:
    print(f"✗ Failed to import JSONParser: {e}")

try:
    from rest_framework.response import Response
    print("✓ Successfully imported Response from rest_framework.response")
except ImportError as e:
    print(f"✗ Failed to import Response: {e}")

try:
    from iceplant_portal.attendance.models import Attendance
    print("✓ Successfully imported Attendance from iceplant_portal.attendance.models")
except ImportError as e:
    print(f"✗ Failed to import Attendance: {e}")

try:
    from iceplant_portal.users.models import EmployeeProfile
    print("✓ Successfully imported EmployeeProfile from iceplant_portal.users.models")
except ImportError as e:
    print(f"✗ Failed to import EmployeeProfile: {e}")

print("\nImport verification complete.")