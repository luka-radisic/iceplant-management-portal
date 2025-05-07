#!/bin/bash
# Script to deploy and verify the module permissions solution
# Instructions: Run this script from the base directory of the iceplant-management-portal project

# Set error handling
set -e

echo "===== Module Permissions System Deployment ====="

# Step 1: Check for Python/Django
echo "Checking for Python/Django..."
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
    echo "  Python detected: $(python3 --version)"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
    echo "  Python detected: $(python --version)"
else
    echo "  Python not found. Please install Python and try again."
    exit 1
fi

# Check if this is a Docker deployment
if [ -f "docker-compose.yml" ]; then
    IS_DOCKER=true
    echo "Docker deployment detected. Will use docker-compose for Django commands."
else
    IS_DOCKER=false
fi

# Step 2: Verify the new files exist
echo "Verifying new files exist..."
required_files=(
    "iceplant_portal/iceplant_core/module_permissions_system.py"
    "iceplant_portal/iceplant_core/management/commands/sync_module_permissions.py"
    "iceplant_portal/iceplant_core/apps.py"
    "integrate_module_permissions.py"
    "test_module_permissions.py"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  Found: $file"
    else
        echo "  Missing: $file"
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    echo "Missing required files. Please ensure all files are in the correct location."
    exit 1
fi

# Step 3: Run the integration script
echo "Running integration script..."
if [ "$IS_DOCKER" = true ]; then
    docker-compose run --rm web python manage.py shell < integrate_module_permissions.py
else
    $PYTHON_CMD manage.py shell < integrate_module_permissions.py
fi

# Step 4: Sync module permissions
echo "Syncing module permissions..."
if [ "$IS_DOCKER" = true ]; then
    docker-compose run --rm web python manage.py sync_module_permissions
else
    $PYTHON_CMD manage.py sync_module_permissions
fi

# Step 5: Check HR Payrol group specifically
echo "Checking HR Payrol group permissions..."
if [ "$IS_DOCKER" = true ]; then
    docker-compose run --rm web python manage.py sync_module_permissions --group "HR Payrol" || echo "  Note: HR Payrol group might not exist"
else
    $PYTHON_CMD manage.py sync_module_permissions --group "HR Payrol" || echo "  Note: HR Payrol group might not exist"
fi

# Step 6: Restart server suggestion
echo "Next Steps:"
if [ "$IS_DOCKER" = true ]; then
    echo "  1. Restart the server with: docker-compose restart web"
else
    echo "  1. Restart your Django server to apply all changes"
fi
echo "  2. Check the Django admin interface to verify module permissions are visible"
echo "  3. Test that HR Payrol users can access attendance and expenses modules"

# Done
echo "===== Deployment Complete ====="
echo "For troubleshooting, see IMPLEMENTATION_GUIDE.md"
