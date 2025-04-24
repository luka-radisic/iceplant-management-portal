# Editing Files Inside Docker Containers

When working with Docker containers, you might encounter situations where common text editors like `nano` or `vim` are not installed. Here are several methods to edit files in such cases:

## Method 1: Using Echo and Redirection

You can use the `echo` command with redirection to create or modify files:

```bash
# View the current file content first
cat /app/iceplant_portal/iceplant_core/settings.py | grep ALLOWED_HOSTS

# Add cma.atlantis-fishing.com to ALLOWED_HOSTS
# First, create a temporary file with the correct content
echo "ALLOWED_HOSTS = ['localhost', '127.0.0.1', '146.190.201.119', 'cma.atlantis-fishing.com']" > /tmp/allowed_hosts_line

# Now use sed to replace the line in the original file
sed -i 's/ALLOWED_HOSTS = \[[^]]*\]/ALLOWED_HOSTS = \['\''localhost'\'', '\''127.0.0.1'\'', '\''146.190.201.119'\'', '\''cma.atlantis-fishing.com'\''\]/g' /app/iceplant_portal/iceplant_core/settings.py

# Do the same for CORS settings if they exist
sed -i '/CORS_ALLOWED_ORIGINS/,/]/c\CORS_ALLOWED_ORIGINS = [\n    "http://localhost:5173",\n    "http://127.0.0.1:5173",\n    "http://cma.atlantis-fishing.com",\n    "https://cma.atlantis-fishing.com",\n]' /app/iceplant_portal/iceplant_core/settings.py

# Check the changes
cat /app/iceplant_portal/iceplant_core/settings.py | grep -A 5 ALLOWED_HOSTS
cat /app/iceplant_portal/iceplant_core/settings.py | grep -A 5 CORS_ALLOWED_ORIGINS
```

## Method 2: Install a Text Editor

You can install a text editor inside the container:

```bash
# Update package lists
apt-get update

# Install nano
apt-get install -y nano

# Now you can use nano
nano /app/iceplant_portal/iceplant_core/settings.py
```

## Method 3: Mount the File for External Editing

If you need to make more extensive changes, you can copy the file from the container to your host, edit it there, and then copy it back:

```bash
# From your host (not inside the container), copy the file
docker cp iceplant-app:/app/iceplant_portal/iceplant_core/settings.py ./settings.py

# Edit the file on your host machine with any editor

# Then copy it back to the container
docker cp ./settings.py iceplant-app:/app/iceplant_portal/iceplant_core/settings.py
```

## Method 4: Use Python to Modify the File

Since it's a Python file, you can use Python to modify it:

```bash
# Create a Python script to modify settings.py
cat > /tmp/modify_settings.py << 'EOF'
import re

# Read the original file
with open('/app/iceplant_portal/iceplant_core/settings.py', 'r') as f:
    content = f.read()

# Replace ALLOWED_HOSTS
modified_content = re.sub(
    r"ALLOWED_HOSTS\s*=\s*\[[^\]]*\]",
    "ALLOWED_HOSTS = ['localhost', '127.0.0.1', '146.190.201.119', 'cma.atlantis-fishing.com']",
    content
)

# Write the modified content back to the file
with open('/app/iceplant_portal/iceplant_core/settings.py', 'w') as f:
    f.write(modified_content)

print("File updated successfully!")
EOF

# Run the script
python /tmp/modify_settings.py
```

After making these changes, restart your Django application with:

```bash
cd /app/iceplant_portal
pkill -f runserver
python manage.py runserver 0.0.0.0:8000 &
```
