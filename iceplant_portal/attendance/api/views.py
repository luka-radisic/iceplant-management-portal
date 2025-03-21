import pandas as pd
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from datetime import datetime, timedelta
import pytz

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
    
    def clean_department(self, department):
        """Remove the 'Santa Rita Iceplant\' prefix from department names"""
        if department and isinstance(department, str):
            return department.replace('Santa Rita Iceplant\\', '').strip()
        return department
    
    def make_aware(self, naive_datetime):
        """Convert naive datetime to timezone-aware datetime"""
        if naive_datetime is None:
            return None
        if timezone.is_aware(naive_datetime):
            return naive_datetime
        return timezone.make_aware(naive_datetime, timezone=pytz.UTC)
    
    def clean_check_ins(self, df):
        """Remove duplicate check-ins within 3 minutes"""
        print("Cleaning duplicate check-ins...")
        df = df.sort_values(['Person ID', 'Time'])
        cleaned_records = []
        
        for employee_id, group in df.groupby('Person ID'):
            last_time = None
            for _, row in group.iterrows():
                current_time = pd.to_datetime(row['Time'])
                
                # If this is the first record or more than 3 minutes from last record
                if last_time is None or (current_time - last_time).total_seconds() > 180:
                    cleaned_records.append(row)
                    last_time = current_time
                else:
                    print(f"Skipping duplicate check-in for {employee_id} at {current_time}")
            
        return pd.DataFrame(cleaned_records)

    def add_no_show_records(self, employee_ids, start_date, end_date):
        """Add NO SHOW records for missing days"""
        print("Adding NO SHOW records...")
        no_shows = []
        date_range = pd.date_range(start_date, end_date)
        
        for employee_id in employee_ids:
            # Get existing attendance records for this employee
            existing_records = Attendance.objects.filter(
                employee_id=employee_id,
                check_in__date__range=(start_date, end_date)
            ).values_list('check_in__date', flat=True)
            
            # Convert to set for faster lookup
            existing_dates = set(existing_records)
            
            # Find missing dates
            for date in date_range:
                if date.date() not in existing_dates:
                    print(f"Adding NO SHOW for {employee_id} on {date.date()}")
                    no_shows.append({
                        'employee_id': employee_id,
                        'check_in': self.make_aware(date),
                        'check_out': None,
                        'department': 'NO SHOW',
                        'import_date': timezone.now().date()
                    })
        
        return no_shows

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def import_xlsx(self, request):
        """
        Import attendance records from Smart PSS Lite XLSX export
        """
        print("Starting XLSX import...")
        if 'file' not in request.FILES:
            print("No file found in request.FILES")
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        xlsx_file = request.FILES['file']
        print(f"Received file: {xlsx_file.name}, size: {xlsx_file.size} bytes")
        import_log = ImportLog(filename=xlsx_file.name)
        
        try:
            # Read Excel file
            print("Reading Excel file...")
            df = pd.read_excel(xlsx_file)
            print(f"Excel file read successfully. Shape: {df.shape}")
            print(f"Columns found: {df.columns.tolist()}")
            
            # Validate required columns
            required_columns = ['Time', 'Person ID', 'Department', 'Attendance Event']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                print(f"Missing columns: {missing_columns}")
                import_log.success = False
                import_log.error_message = f"Missing required columns: {', '.join(missing_columns)}"
                import_log.save()
                return Response(
                    {'error': f"Missing required columns: {', '.join(missing_columns)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Clean and prepare data
            print("Cleaning department names...")
            df['Department'] = df['Department'].apply(self.clean_department)
            
            # Remove duplicate check-ins
            df = self.clean_check_ins(df)
            df = df.sort_values(['Person ID', 'Time'])
            print(f"Found {len(df)} records after cleaning duplicates")
            
            # Get date range and unique employees
            start_date = pd.to_datetime(df['Time']).min().date()
            end_date = pd.to_datetime(df['Time']).max().date()
            employee_ids = df['Person ID'].unique()
            
            # Process records within a transaction
            with transaction.atomic():
                records_created = 0
                current_date = None
                current_employee = None
                check_in_time = None
                
                print("Processing attendance records...")
                for _, row in df.iterrows():
                    # Convert to timezone-aware datetime
                    event_time = self.make_aware(pd.to_datetime(row['Time']))
                    employee_id = str(row['Person ID'])
                    
                    # If we're processing a new day or new employee, reset check-in time
                    if (current_date != event_time.date() or 
                        current_employee != employee_id):
                        if check_in_time and current_employee:
                            # Create record for previous employee if they didn't check out
                            print(f"Creating record for employee {current_employee} (no checkout)")
                            Attendance.objects.create(
                                employee_id=current_employee,
                                check_in=check_in_time,
                                check_out=None,
                                department=row['Department'],
                                import_date=current_date
                            )
                            records_created += 1
                        
                        current_date = event_time.date()
                        current_employee = employee_id
                        check_in_time = event_time
                        print(f"New check-in for employee {employee_id} at {event_time}")
                    else:
                        # This is a check-out for the current employee
                        if check_in_time:
                            # Only create record if there was a check-in
                            print(f"Creating record for employee {employee_id} (with checkout)")
                            Attendance.objects.create(
                                employee_id=employee_id,
                                check_in=check_in_time,
                                check_out=event_time,
                                department=row['Department'],
                                import_date=current_date
                            )
                            records_created += 1
                            check_in_time = None
                
                # Handle the last record if it was a check-in
                if check_in_time and current_employee:
                    print(f"Creating final record for employee {current_employee}")
                    Attendance.objects.create(
                        employee_id=current_employee,
                        check_in=check_in_time,
                        check_out=None,
                        department=row['Department'],
                        import_date=current_date
                    )
                    records_created += 1
                
                # Add NO SHOW records
                no_show_records = self.add_no_show_records(employee_ids, start_date, end_date)
                if no_show_records:
                    print(f"Adding {len(no_show_records)} NO SHOW records")
                    Attendance.objects.bulk_create([
                        Attendance(**record) for record in no_show_records
                    ])
                    records_created += len(no_show_records)
                
                import_log.records_imported = records_created
                import_log.success = True
                import_log.save()
                print(f"Import completed successfully. Created {records_created} records.")
            
            return Response({
                'message': f'Successfully imported {records_created} attendance records',
                'import_log_id': import_log.id
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"Error during import: {str(e)}")
            import_traceback = __import__('traceback')
            print(f"Traceback: {import_traceback.format_exc()}")
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