@echo off
echo Fixing HR Payrol permissions...

rem Run integration script
python manage.py shell < integrate_hr_payrol_permissions.py

echo HR Payrol permissions fixed!
pause
