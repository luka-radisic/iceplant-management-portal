from django.db import models
from django.contrib.auth.models import User

# Legacy custom permission/role models removed.
# The application now primarily uses Django's built-in
# is_staff and is_superuser flags for access control.

# If more granular permissions are needed in the future,
# Django's built-in permission framework (Groups, Permissions)
# or a new RBAC system should be considered. 