# Deploy Module Permissions System
# This script deploys the module permissions system to fix the HR Payrol group permissions issue

Write-Host "Deploying Module Permissions System..." -ForegroundColor Green

# 1. Set up Python environment
Write-Host "Setting up Python environment..."
$env:PYTHONPATH = "$PWD;$env:PYTHONPATH"

# 2. Run the deployment
Write-Host "Running deployment script..."
python deploy_module_permissions.py

# 3. Sync permissions
Write-Host "Syncing module permissions..."
python iceplant_portal/manage.py sync_module_permissions

# 4. Restart services if needed
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "Please restart your Django server to apply the changes."
