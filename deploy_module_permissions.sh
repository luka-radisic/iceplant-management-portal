#!/bin/bash
# Deploy Module Permissions System
# This script deploys the module permissions system to fix the HR Payrol group permissions issue

echo -e "[32mDeploying Module Permissions System...[0m"

# 1. Set up Python environment
echo "Setting up Python environment..."
export PYTHONPATH=$PWD:$PYTHONPATH

# 2. Run the deployment
echo "Running deployment script..."
python deploy_module_permissions.py

# 3. Sync permissions
echo "Syncing module permissions..."
python iceplant_portal/manage.py sync_module_permissions

# 4. Restart services if needed
echo -e "[32mDeployment complete![0m"
echo "Please restart your Django server to apply the changes."
