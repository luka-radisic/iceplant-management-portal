import os
from pathlib import Path

# ... existing settings ...

# Media files (Uploaded files)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Ensure MEDIA_ROOT directory exists
os.makedirs(MEDIA_ROOT, exist_ok=True)
os.makedirs(os.path.join(MEDIA_ROOT, 'employee_photos'), exist_ok=True)

# ... rest of the settings ... 