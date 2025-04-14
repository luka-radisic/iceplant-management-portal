"""
This file contains the implementation of the add_missing_days endpoint
for the AttendanceViewSet. This is a reference implementation that should
be added to the AttendanceViewSet class in views.py.
"""

from rest_framework.decorators import action
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from iceplant_portal.attendance.models import Attendance, EmployeeProfile

@action(detail=False, methods=['post'], url_path='add-missing-days', parser_classes=[JSONParser])
def add_missing_days(self, request):
    """
    Add missing 'No Show' attendance records for employees with no punch records in the given date range.
    POST body: {"start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"}
    """
    from datetime import timedelta, datetime, time
    from django.utils import timezone
    import pytz

    # Parse date range from request
    start_date_str = request.data.get('start_date')
    end_date_str = request.data.get('end_date')
    manila_tz = pytz.timezone('Asia/Manila')
    today = timezone.now().astimezone(manila_tz).date()
    
    if not start_date_str or not end_date_str:
        # Default: last 30 days
        end_date = today
        start_date = today - timedelta(days=29)
    else:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except Exception:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)
    
    if start_date > end_date:
        return Response({'error': 'start_date must be before or equal to end_date.'}, status=400)

    # Get all active employees
    employees = EmployeeProfile.objects.filter(is_active=True)
    employee_map = {e.employee_id: e.full_name for e in employees}
    
    added_records = []
    checked_dates = []
    
    for single_date in (start_date + timedelta(n) for n in range((end_date - start_date).days + 1)):
        checked_dates.append(str(single_date))
        for emp_id, emp_name in employee_map.items():
            # Check if any attendance exists for this employee on this date
            exists = Attendance.objects.filter(
                employee_id=emp_id, 
                check_in__date=single_date
            ).exists()
            
            if not exists:
                # Idempotency: do not create if already exists
                Attendance.objects.create(
                    employee_id=emp_id,
                    employee_name=emp_name,
                    check_in=manila_tz.localize(datetime.combine(single_date, time(hour=8, minute=0))),
                    check_out=None,
                    department='NO SHOW',
                    import_date=single_date
                )
                added_records.append({
                    'employee_id': emp_id, 
                    'employee_name': emp_name, 
                    'date': str(single_date)
                })
    
    return Response({
        'added_count': len(added_records),
        'added_records': added_records,
        'checked_dates': checked_dates
    })