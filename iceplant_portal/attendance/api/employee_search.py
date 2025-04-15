from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
from attendance.models import Attendance

class AttendanceEmployeeSearchView(APIView):
    """API endpoint for searching employees in attendance records"""
    
    def get(self, request):
        search_term = request.query_params.get('search', '')
        if not search_term or len(search_term) < 2:
            return Response({"count": 0, "results": []})
        
        # Search in attendance records for employee_name and employee_id
        attendance_records = Attendance.objects.filter(
            Q(employee_name__icontains=search_term) | 
            Q(employee_id__icontains=search_term)
        ).values('employee_id', 'employee_name', 'department').distinct()
        
        # Convert to a list of employee profiles
        results = []
        seen_ids = set()
        
        for record in attendance_records:
            if record['employee_id'] in seen_ids:
                continue
                
            seen_ids.add(record['employee_id'])
            results.append({
                'employee_id': record['employee_id'],
                'full_name': record['employee_name'],
                'department': record['department'] or '',
            })
        
        return Response({"count": len(results), "results": results})
