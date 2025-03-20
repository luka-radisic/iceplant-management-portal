import pandas as pd
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction
from django.utils.dateparse import parse_datetime

from attendance.models import Attendance, ImportLog
from .serializers import AttendanceSerializer, ImportLogSerializer

class AttendanceViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Attendance records
    """
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    filterset_fields = ['employee_id', 'department', 'import_date']
    search_fields = ['employee_id', 'department']
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def import_xlsx(self, request):
        """
        Import attendance records from XLSX file
        """
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        xlsx_file = request.FILES['file']
        import_log = ImportLog(filename=xlsx_file.name)
        
        try:
            # Read Excel file
            df = pd.read_excel(xlsx_file)
            
            # Basic validation
            required_columns = ['employee_id', 'check_in', 'department']
            for col in required_columns:
                if col not in df.columns:
                    import_log.success = False
                    import_log.error_message = f"Missing required column: {col}"
                    import_log.save()
                    return Response(
                        {'error': f"Missing required column: {col}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Process records within a transaction
            with transaction.atomic():
                records_created = 0
                for _, row in df.iterrows():
                    # Parse dates
                    check_in = parse_datetime(str(row['check_in'])) if 'check_in' in row else None
                    check_out = parse_datetime(str(row['check_out'])) if 'check_out' in row and not pd.isna(row['check_out']) else None
                    
                    if not check_in:
                        continue  # Skip records without check-in time
                    
                    # Create attendance record
                    Attendance.objects.create(
                        employee_id=row['employee_id'],
                        check_in=check_in,
                        check_out=check_out,
                        department=row['department']
                    )
                    records_created += 1
                
                import_log.records_imported = records_created
                import_log.save()
            
            return Response({
                'message': f'Successfully imported {records_created} records',
                'import_log_id': import_log.id
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            import_log.success = False
            import_log.error_message = str(e)
            import_log.save()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ImportLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for Import Logs
    """
    queryset = ImportLog.objects.all().order_by('-import_date')
    serializer_class = ImportLogSerializer 