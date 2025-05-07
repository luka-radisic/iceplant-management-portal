# Script to deploy and verify the module permissions solution
# Instructions: Run this script from the base directory of the iceplant-management-portal project

# Set error handling
$ErrorActionPreference = "Stop"

Write-Host "===== Module Permissions System Deployment =====" -ForegroundColor Green

# Step 1: Check for Python/Django
Write-Host "Checking for Python/Django..." -ForegroundColor Cyan
try {
    $pythonVersion = python --version
    Write-Host "  Python detected: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  Python not found. Please install Python and try again." -ForegroundColor Red
    exit 1
}

# Check if this is a Docker deployment
$isDocker = Test-Path -Path "docker-compose.yml"
if ($isDocker) {
    Write-Host "Docker deployment detected. Will use docker-compose for Django commands." -ForegroundColor Cyan
}

# Step 2: Verify the new files exist
Write-Host "Verifying new files exist..." -ForegroundColor Cyan
$requiredFiles = @(
    "iceplant_portal\iceplant_core\module_permissions_system.py",
    "iceplant_portal\iceplant_core\management\commands\sync_module_permissions.py",
    "iceplant_portal\iceplant_core\apps.py",
    "integrate_module_permissions.py",
    "test_module_permissions.py"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (Test-Path -Path $file) {
        Write-Host "  Found: $file" -ForegroundColor Green
    } else {
        Write-Host "  Missing: $file" -ForegroundColor Red
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "Missing required files. Please ensure all files are in the correct location." -ForegroundColor Red
    exit 1
}

# Step 3: Run the integration script
Write-Host "Running integration script..." -ForegroundColor Cyan
if ($isDocker) {
    docker-compose run --rm web python manage.py shell < integrate_module_permissions.py
} else {
    try {
        python manage.py shell < integrate_module_permissions.py
    } catch {
        Write-Host "Failed to run integration script. Make sure you're in the project root directory." -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        exit 1
    }
}

# Step 4: Sync module permissions
Write-Host "Syncing module permissions..." -ForegroundColor Cyan
if ($isDocker) {
    docker-compose run --rm web python manage.py sync_module_permissions
} else {
    try {
        python manage.py sync_module_permissions
    } catch {
        Write-Host "Failed to sync module permissions." -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        exit 1
    }
}

# Step 5: Check HR Payrol group specifically
Write-Host "Checking HR Payrol group permissions..." -ForegroundColor Cyan
if ($isDocker) {
    docker-compose run --rm web python manage.py sync_module_permissions --group "HR Payrol"
} else {
    try {
        python manage.py sync_module_permissions --group "HR Payrol"
    } catch {
        Write-Host "Failed to sync HR Payrol permissions. The group might not exist." -ForegroundColor Yellow
        Write-Host "Error: $_" -ForegroundColor Yellow
    }
}

# Step 6: Restart server suggestion
Write-Host "Next Steps:" -ForegroundColor Cyan
if ($isDocker) {
    Write-Host "  1. Restart the server with: docker-compose restart web" -ForegroundColor Yellow
} else {
    Write-Host "  1. Restart your Django server to apply all changes" -ForegroundColor Yellow
}
Write-Host "  2. Check the Django admin interface to verify module permissions are visible" -ForegroundColor Yellow
Write-Host "  3. Test that HR Payrol users can access attendance and expenses modules" -ForegroundColor Yellow

# Done
Write-Host "===== Deployment Complete =====" -ForegroundColor Green
Write-Host "For troubleshooting, see IMPLEMENTATION_GUIDE.md" -ForegroundColor Cyan
