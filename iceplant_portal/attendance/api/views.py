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
        """Convert naive datetime to timezone-aware datetime, treating input as Asia/Manila time"""
        if naive_datetime is None:
            return None
        if timezone.is_aware(naive_datetime):
            return naive_datetime
            
        # Create a timezone object for Philippines
        manila_tz = pytz.timezone('Asia/Manila')
        
        # Localize the naive datetime to Manila time
        local_dt = manila_tz.localize(naive_datetime)
        
        # Convert to UTC for storage
        return local_dt.astimezone(pytz.UTC)
    
    def clean_check_ins(self, df):
        """Clean and format attendance records from XLSX file"""
        print("Processing attendance records...")
        
        # Convert Time column to datetime
        df['Time'] = pd.to_datetime(df['Time'])
        
        # Create records list
        cleaned_records = []
        for _, record in df.iterrows():
            # Create naive datetime object
            time = record['Time'].to_pydatetime()
            
            new_record = {
                'Time': time,
                'Person ID': record['Person ID'],
                'Name': record['Name'],
                'Department': self.clean_department(record['Department']),
                'Attendance Event': record['Attendance Event']
            }
            
            # Log in local time for debugging
            manila_tz = pytz.timezone('Asia/Manila')
            aware_time = self.make_aware(time)
            local_time = aware_time.astimezone(manila_tz)
            
            print(f"Processing record: ID {new_record['Person ID']}, "
                  f"Name: {new_record['Name']}, "
                  f"Original Time: {time.strftime('%Y-%m-%d %H:%M')}, "
                  f"Local Time: {local_time.strftime('%Y-%m-%d %H:%M')}, "
                  f"Event: {new_record['Attendance Event']}, "
                  f"Dept: {new_record['Department']}")
            
            cleaned_records.append(new_record)
        
        # Sort by time after all records are processed
        df_cleaned = pd.DataFrame(cleaned_records)
        return df_cleaned.sort_values(['Time'], ascending=False)

    def add_no_show_records(self, employee_ids, start_date, end_date):
        """Add NO SHOW records for missing employees"""
        print("Adding NO SHOW records...")
        no_shows = []
        
        # Get all employee names (including those not present today)
        all_employees = {
            str(id_): Attendance.objects.filter(employee_id=str(id_))
                                      .values_list('employee_name', flat=True)
                                      .first()
            for id_ in range(1, 17)  # Assuming employee IDs 1-16
        }
        
        # Find employees without records for today
        present_ids = set(str(id_) for id_ in employee_ids)
        missing_ids = set(all_employees.keys()) - present_ids
        
        for employee_id in missing_ids:
            employee_name = all_employees[employee_id]
            if employee_name:
                print(f"Adding NO SHOW for {employee_id} ({employee_name})")
                no_shows.append({
                    'employee_id': employee_id,
                    'employee_name': employee_name,
                    'check_in': self.make_aware(datetime.combine(start_date, datetime.min.time().replace(hour=8))),
                    'check_out': None,
                    'department': 'NO SHOW',
                    'import_date': start_date
                })
        
        return no_shows

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def import_xlsx(self, request):
        """Import attendance records from Smart PSS Lite XLSX export"""
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
            required_columns = ['Time', 'Person ID', 'Name', 'Department', 'Attendance Event']
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
            
            # Process records
            df = self.clean_check_ins(df)
            print(f"Found {len(df)} records after processing")
            
            # Get date range (using local time)
            manila_tz = pytz.timezone('Asia/Manila')
            start_date = self.make_aware(df['Time'].min().to_pydatetime()).astimezone(manila_tz).date()
            end_date = self.make_aware(df['Time'].max().to_pydatetime()).astimezone(manila_tz).date()
            employee_ids = df['Person ID'].unique()
            
            # Process records within a transaction
            with transaction.atomic():
                # Delete existing records for this date range
                Attendance.objects.filter(
                    check_in__date__range=(start_date, end_date)
                ).delete()
                
                records_created = 0
                
                # Create new records exactly as they appear in the file
                for _, row in df.iterrows():
                    check_in_time = self.make_aware(row['Time'].to_pydatetime())
                    local_time = check_in_time.astimezone(manila_tz)
                    
                    print(f"Creating record for {row['Name']}: "
                          f"Time: {local_time.strftime('%Y-%m-%d %H:%M')} "
                          f"Event: {row['Attendance Event']} "
                          f"Dept: {row['Department']}")
                    
                    Attendance.objects.create(
                        employee_id=str(row['Person ID']),
                        employee_name=str(row['Name']),
                        check_in=check_in_time,
                        check_out=None,  # No checkout times in original data
                        department=row['Department'],
                        import_date=local_time.date()
                    )
                    records_created += 1
                
                # Add NO SHOW records for missing employees
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