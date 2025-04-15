import pandas as pd
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import transaction
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from datetime import datetime, timedelta, time
import pytz
from rest_framework.viewsets import ModelViewSet
import os
from django.http import Http404
from rest_framework.pagination import PageNumberPagination
from django.db.models import F, ExpressionWrapper, DurationField, Count, Q, Func, DateField
from django.db.models.functions import Extract, TruncDate
from dateutil.relativedelta import relativedelta
from datetime import date
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import filters
from rest_framework.metadata import SimpleMetadata

from attendance.models import Attendance, ImportLog, EmployeeShift, EmployeeProfile, DepartmentShift
from .serializers import (
    AttendanceSerializer, 
    ImportLogSerializer, 
    EmployeeProfileSerializer,
    DepartmentShiftSerializer
)
from .filters import AttendanceFilter

class AttendanceViewSet(viewsets.ModelViewSet):
    """
    API endpoint for attendance records.
    """
    queryset = Attendance.objects.all().order_by('-check_in')
    serializer_class = AttendanceSerializer
    filterset_class = AttendanceFilter
    search_fields = ['employee_id', 'department', 'employee_name']
    pagination_class = PageNumberPagination
    page_size = 50  # Default page size
    page_size_query_param = 'page_size'
    max_page_size = 500  # Maximum allowed page size
    permission_classes = [IsAuthenticated]
    
    # Override perform_update to control hr_notes access
    def perform_update(self, serializer):
        user = self.request.user
        is_hr = user.groups.filter(name='HR').exists()

        validated_data = serializer.validated_data
        
        if not is_hr and 'hr_notes' in validated_data:
            # If user is not HR, remove hr_notes from data before saving
            validated_data.pop('hr_notes')
            print(f"User {user.username} (not HR) attempted to update hr_notes. Field removed before save.")

        # Check if instance exists before saving
        # instance = serializer.instance
        # if instance:
        #    print(f"Saving instance {instance.id} with data: {validated_data}")
        # else:
        #    print("Attempting to save a new instance during update?") # Should not happen in standard update
        
        serializer.save()
        print(f"Attendance record update performed by user {user.username}. HR status: {is_hr}")

    def _get_filtered_queryset(self, params):
        """ Helper function to get base queryset based on filters """
        queryset = Attendance.objects.all()
        
        employee_id = params.get('employee_id')
        start_date = params.get('start_date')
        end_date = params.get('end_date')
        department = params.get('department')
        status_filter = params.get('status')
        
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        if start_date:
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                start_dt = datetime.combine(start_dt.date(), time.min)  # 00:00:00
                queryset = queryset.filter(check_in__gte=start_dt)
            except ValueError:
                pass  # Ignore invalid date
                
        if end_date:
            try:
                end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                end_dt = datetime.combine(end_dt.date(), time.max)  # 23:59:59.999999
                queryset = queryset.filter(check_in__lte=end_dt)
            except ValueError:
                pass  # Ignore invalid date
        
        # Correctly filter by department (cleaned or prefixed)
        if department:
            prefix = "Atlantis Fishing Development Corp\\"
            prefixed_department = prefix + department
            queryset = queryset.filter(
                Q(department=department) | Q(department=prefixed_department)
            )
        
        # Apply status filters directly here for consistency
        if status_filter == 'present':
            queryset = queryset.exclude(department='NO SHOW')
        elif status_filter == 'no-show':
            queryset = queryset.filter(department='NO SHOW')
        elif status_filter == 'missing-checkout':
            queryset = queryset.filter(check_out__isnull=True).exclude(department='NO SHOW')
        approval_status = params.get('approval_status')
        if approval_status:
            queryset = queryset.filter(approval_status=approval_status)
            
        return queryset

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Don't process same-day check-ins on every request - this is causing performance issues
        # Only process if explicitly requested using a query parameter
        if self.request.query_params.get('process_checkins') == 'true':
            self.process_same_day_checkins()
            
        # Extract request parameters
        employee_id = self.request.query_params.get('employee_id')
        start_date_str = self.request.query_params.get('start_date')
        end_date_str = self.request.query_params.get('end_date')
        department = self.request.query_params.get('department')
        status = self.request.query_params.get('status')
        
        # Use select_related to optimize queries
        queryset = queryset.select_related()
        
        # Apply employee filter if provided
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        # Apply date range filters if provided
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                start_dt = datetime.combine(start_date, time.min)
                start_dt = timezone.make_aware(start_dt, timezone.get_current_timezone())
                queryset = queryset.filter(check_in__gte=start_dt)
            except Exception:
                pass
                
        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                end_dt = datetime.combine(end_date, time.max)
                end_dt = timezone.make_aware(end_dt, timezone.get_current_timezone())
                queryset = queryset.filter(check_in__lte=end_dt)
            except Exception:
                pass
        
        # Remap cleaned department filter param to raw prefixed value
        if department:
            prefix = "Atlantis Fishing Development Corp\\"
            raw_department = prefix + department
            queryset = queryset.filter(department__in=[department, raw_department])
        
        # Apply status filters
        if status == 'present':
            queryset = queryset.exclude(department='NO SHOW')
        elif status == 'no-show':
            queryset = queryset.filter(department='NO SHOW')
        elif status == 'missing-checkout':
            queryset = queryset.filter(check_out__isnull=True).exclude(department='NO SHOW')
        elif status == 'late':
            # For late arrivals, we need to join with EmployeeShift
            if employee_id:
                try:
                    shift = EmployeeShift.objects.get(employee_id=employee_id)
                    shift_start = shift.shift_start
                    # Add 1 hour grace period
                    grace_period = timedelta(hours=1)
                    
                    # Convert shift start time to a time delta for comparison
                    shift_start_parts = shift_start.strftime('%H:%M').split(':')
                    shift_start_delta = timedelta(
                        hours=int(shift_start_parts[0]),
                        minutes=int(shift_start_parts[1])
                    ) + grace_period
                    
                    # Add time comparison
                    queryset = queryset.annotate(
                        check_in_time=ExpressionWrapper(
                            F('check_in__hour') * 60 + F('check_in__minute'),
                            output_field=DurationField()
                        )
                    ).filter(
                        check_in_time__gt=shift_start_delta.total_seconds() / 60
                    ).exclude(department='NO SHOW')
                except EmployeeShift.DoesNotExist:
                    pass
        
        # Add index hints if supported by the database backend
        if hasattr(queryset, 'using_index'):
            queryset = queryset.using_index('check_in_idx')
            
        return queryset.order_by('-check_in')
    
    def process_same_day_checkins(self):
        """
        Process attendance records to detect same-day multiple check-ins
        and treat them as check-in/check-out pairs.
        
        This method looks for employees with multiple check-ins on the same day 
        and updates the records to properly represent check-in and check-out events.
        """
        try:
            # Get distinct employee IDs with attendance records
            employee_ids = Attendance.objects.values_list('employee_id', flat=True).distinct()
            
            for employee_id in employee_ids:
                # Process each employee's records
                self._process_employee_checkins(employee_id)
        except Exception as e:
            print(f"Error processing same-day check-ins: {str(e)}")
    
    def _process_employee_checkins(self, employee_id):
        """Process check-ins for a specific employee, consolidating same-day records."""
        # Get all check-ins for the employee ordered by time
        records = Attendance.objects.filter(
            employee_id=employee_id
        ).order_by('check_in')
        
        # Group records by date (using Manila timezone)
        date_records = {}
        manila_tz = pytz.timezone('Asia/Manila')
        for record in records:
            local_date = record.check_in.astimezone(manila_tz).date()
            if local_date not in date_records:
                date_records[local_date] = []
            date_records[local_date].append(record)
        
        # Process each day's records
        for date, day_records in date_records.items():
            if len(day_records) >= 2:
                # If there are multiple check-ins on the same day
                earliest_record = day_records[0]
                latest_record = day_records[-1]
                records_to_delete = day_records[1:] # All records except the first

                # Update the earliest record's check_out time to the latest check_in time
                # only if it makes sense (latest is after earliest)
                if latest_record.check_in > earliest_record.check_in:
                    # Check if check_out needs updating (is null or earlier than latest check_in)
                    should_update = False
                    if earliest_record.check_out is None:
                        should_update = True
                    else:
                        # Make check_out aware for comparison if it exists
                        aware_checkout = timezone.make_aware(earliest_record.check_out, manila_tz) if timezone.is_naive(earliest_record.check_out) else earliest_record.check_out.astimezone(manila_tz)
                        if aware_checkout < latest_record.check_in.astimezone(manila_tz):
                            should_update = True
                    
                    if should_update:
                        original_checkout = earliest_record.check_out
                        earliest_record.check_out = latest_record.check_in
                        earliest_record.save()
                        print(f"Consolidated records for employee {employee_id} on {date}: Updated record {earliest_record.id} check-out from {original_checkout} to {earliest_record.check_out}")
                    else:
                         print(f"Consolidated records for employee {employee_id} on {date}: Record {earliest_record.id} check-out {earliest_record.check_out} is already later than or equal to latest check-in {latest_record.check_in}. No update needed.")

                # Delete the subsequent records for that day
                deleted_ids = []
                for record_to_delete in records_to_delete:
                    deleted_ids.append(record_to_delete.id)
                    record_to_delete.delete()
                
                if deleted_ids:
                    print(f"Consolidated records for employee {employee_id} on {date}: Deleted redundant records: {deleted_ids}")
    
    def paginate_queryset(self, queryset):
        """Override to handle pagination properly"""
        try:
            # Get the requested page size
            page_size = self.request.query_params.get(self.page_size_query_param)
            if page_size:
                # Ensure page size doesn't exceed max
                page_size = min(int(page_size), self.max_page_size)
                self.paginator.page_size = page_size
            
            return super().paginate_queryset(queryset)
        except Exception as e:
            print(f"Pagination error: {str(e)}")
            # If page is out of range, return last page
            if 'Page is not a valid value' in str(e):
                # Get the last valid page
                page_size = self.paginator.get_page_size(self.request)
                total_items = queryset.count()
                max_page = (total_items - 1) // page_size
                self.request.query_params._mutable = True
                self.request.query_params['page'] = str(max_page + 1)
                self.request.query_params._mutable = False
                return super().paginate_queryset(queryset)
            return []
    
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
                
                # Process same-day check-ins to link check-in/check-out pairs
                print("Processing same-day check-ins to detect check-out events...")
                self.process_same_day_checkins()
                
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

    @action(detail=False, methods=['post'])
    def process_same_day_records(self, request):
        """
        Manually process existing records to detect and link same-day check-ins.
        This is useful for processing historical data that wasn't processed at import time.
        """
        try:
            print("Processing existing records for same-day check-ins...")
            self.process_same_day_checkins()
            return Response({
                'message': 'Successfully processed records for same-day check-ins'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error processing same-day records: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='cleanup-short-duration')
    def cleanup_short_duration_records(self, request):
        """
        Find and delete attendance records where the duration between check-in
        and check-out is less than 5 minutes.
        """
        threshold = timedelta(minutes=5)
        
        # Annotate queryset with duration
        queryset = Attendance.objects.annotate(
            duration_calc=ExpressionWrapper(F('check_out') - F('check_in'), output_field=DurationField())
        ).filter(
            check_out__isnull=False,  # Ensure check_out exists
            duration_calc__lt=threshold # Filter by duration less than threshold
        )
        
        count = queryset.count()
        deleted_ids = list(queryset.values_list('id', flat=True))
        
        if count > 0:
            print(f"Cleanup: Found {count} records with duration less than {threshold}.")
            print(f"Cleanup: Deleting records with IDs: {deleted_ids}")
            queryset.delete()
            message = f"Successfully deleted {count} records with duration less than 5 minutes."
        else:
            print("Cleanup: No records found with duration less than 5 minutes.")
            message = "No records found with duration less than 5 minutes."
            
        return Response({'message': message, 'deleted_count': count, 'deleted_ids': deleted_ids}, status=status.HTTP_200_OK)
    @action(detail=False, methods=['post'], url_path='add-missing-days', parser_classes=[JSONParser])
    def add_missing_days(self, request):
        """
        Add missing 'No Show' attendance records for employees with no punch records in the given date range.
        
        Parameters:
        - start_date: YYYY-MM-DD (required)
        - end_date: YYYY-MM-DD (required)
        - employee_id: Filter by specific employee ID (optional)
        - department: Filter by specific department (optional)
        - dry_run: If true, only preview changes without creating records (optional)
        """
        from datetime import timedelta, datetime, time
        from django.utils import timezone
        import pytz

        # Parse date range from request
        start_date_str = request.data.get('start_date')
        end_date_str = request.data.get('end_date')
        employee_id = request.data.get('employee_id')
        department = request.data.get('department')
        dry_run = request.data.get('dry_run', False)
        
        # Convert dry_run to boolean if it's a string
        if isinstance(dry_run, str):
            dry_run = dry_run.lower() == 'true'
        
        print(f"Add Missing Days - Parameters: start_date={start_date_str}, end_date={end_date_str}, "
              f"employee_id={employee_id}, department={department}, dry_run={dry_run}")
        
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

        # Get active employees with filters
        employees_query = EmployeeProfile.objects.filter(is_active=True)
        
        # Apply employee_id filter if provided
        if employee_id:
            print(f"Filtering by employee_id: {employee_id}")
            employees_query = employees_query.filter(employee_id=employee_id)
        
        # Apply department filter if provided
        if department:
            print(f"Filtering by department: {department}")
            # Use case-insensitive matching to find departments regardless of case
            employees_query = employees_query.filter(department__iexact=department)
            # If still no results, try partial match
            if not employees_query.exists():
                print(f"No exact match for department '{department}', trying contains search")
                employees_query = EmployeeProfile.objects.filter(is_active=True)
                if employee_id:
                    employees_query = employees_query.filter(employee_id=employee_id)
                employees_query = employees_query.filter(department__icontains=department)
        
        employees = employees_query.all()
        print(f"Found {len(employees)} employees matching filters from EmployeeProfile")
        
        # If no employees found in EmployeeProfile, look in Attendance records
        if len(employees) == 0:
            print("No employees found in EmployeeProfile. Looking in Attendance records instead.")
            attendance_query = Attendance.objects.values('employee_id', 'employee_name', 'department').distinct()
            
            if employee_id:
                attendance_query = attendance_query.filter(employee_id=employee_id)
            
            if department:
                attendance_query = attendance_query.filter(department__iexact=department)
                if not attendance_query.exists():
                    attendance_query = Attendance.objects.values('employee_id', 'employee_name', 'department').distinct()
                    if employee_id:
                        attendance_query = attendance_query.filter(employee_id=employee_id)
                    attendance_query = attendance_query.filter(department__icontains=department)
            
            # Convert attendance records to format expected by the rest of the function
            employees = [
                type('EmployeeFromAttendance', (), {
                    'employee_id': record['employee_id'], 
                    'full_name': record['employee_name']
                }) for record in attendance_query
            ]
            print(f"Found {len(employees)} employees from Attendance records")
        
        # Print out all unique departments in the system for debugging
        all_departments = Attendance.objects.values_list('department', flat=True).distinct()
        print(f"Available departments in Attendance: {', '.join(filter(None, all_departments))}")
        
        # For debugging only - show some example employee IDs that were found
        if employees:
            print(f"Example employee IDs found: {', '.join([e.employee_id for e in employees[:5]])}")
        else:
            print("No employees found in either EmployeeProfile or Attendance")
        
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
                    # Add record to the preview list
                    record_data = {
                        'employee_id': emp_id,
                        'employee_name': emp_name,
                        'date': str(single_date)
                    }
                    added_records.append(record_data)
                    
                    # Only create records if not in dry_run mode
                    if not dry_run:
                        # Retrieve employee's actual department if possible
                        employee_dept = None
                        try:
                            # First try to get from EmployeeProfile
                            profile = EmployeeProfile.objects.get(employee_id=emp_id)
                            employee_dept = profile.department
                        except EmployeeProfile.DoesNotExist:
                            # If not found, try to get from existing attendance records
                            latest_record = Attendance.objects.filter(
                                employee_id=emp_id,
                                department__isnull=False
                            ).exclude(department='NO SHOW').order_by('-check_in').first()
                            
                            if latest_record:
                                employee_dept = latest_record.department
                        
                        print(f"Creating NO SHOW record for {emp_name} ({emp_id}) on {single_date}, department: {employee_dept or 'Unknown'}")
                        Attendance.objects.create(
                            employee_id=emp_id,
                            employee_name=emp_name,
                            check_in=manila_tz.localize(datetime.combine(single_date, time(hour=8, minute=0))),
                            check_out=None,
                            department=employee_dept,  # Use the actual department, not 'NO SHOW'
                            import_date=single_date,
                            no_show=True  # We use the no_show flag instead of department='NO SHOW'
                        )
        
        return Response({
            'added_count': len(added_records),
            'added_records': added_records,
            'checked_dates': checked_dates,
            'dry_run': dry_run
        })

    from rest_framework.permissions import IsAuthenticated
    from rest_framework.permissions import AllowAny
    @action(detail=False, methods=['get'], url_path='weekend-work', permission_classes=[AllowAny])
    def weekend_work(self, request):
        from django.utils import timezone
        import pytz
        manila_tz = pytz.timezone('Asia/Manila')
        """
        Returns attendance records for configurable weekend days within a date range, with filters.
        """
        from django.utils.timezone import localtime
        from datetime import datetime

        # Parse query params
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        weekend_days_str = request.query_params.get('weekend_days', '5,6')  # Default Saturday, Sunday
        department_filter = request.query_params.get('department')
        employee_id_filter = request.query_params.get('employee_id')
        approval_status_filter = request.query_params.get('approval_status')

        weekend_days = set(int(day.strip()) for day in weekend_days_str.split(',') if day.strip().isdigit())

        queryset = self.get_queryset()

        # Filter by date range
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                queryset = queryset.filter(check_in__date__gte=start_date)
            except:
                pass
        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                queryset = queryset.filter(check_in__date__lte=end_date)
            except:
                pass

        # Filter by weekend days
        queryset = [
            r for r in queryset
            if (
                timezone.localtime(r.check_in, manila_tz).date() >= start_date and
                timezone.localtime(r.check_in, manila_tz).date() <= end_date and
                timezone.localtime(r.check_in, manila_tz).weekday() == 6  # 6 = Sunday
            )
        ]

        # Filter by department
        if department_filter:
            queryset = [r for r in queryset if r.department == department_filter]

        # Filter by employee_id
        if employee_id_filter:
            queryset = [r for r in queryset if r.employee_id == employee_id_filter]

        # Filter by approval_status
        if approval_status_filter:
            queryset = [r for r in queryset if getattr(r, 'approval_status', '') == approval_status_filter]

        page = self.paginate_queryset(queryset)
        def serialize(records):
            data = []
            for record in records:
                punch_in_local = localtime(record.check_in)
                punch_out_local = localtime(record.check_out) if record.check_out else None
                duration = None
                if record.check_in and record.check_out:
                    duration = str(record.check_out - record.check_in)
                department_name = getattr(record, 'department', '')
                prefix = "Atlantis Fishing Development Corp\\"
                if department_name.startswith(prefix):
                    department_name = department_name[len(prefix):]
                data.append({
                    'id': record.id,
                    'employee_name': getattr(record, 'employee_name', ''),
                    'date': punch_in_local.date().isoformat(),
                    'punch_in': punch_in_local.time().strftime('%H:%M:%S'),
                    'punch_out': punch_out_local.time().strftime('%H:%M:%S') if punch_out_local else '',
                    'duration': duration or '',
                    'department': department_name,
                    'approval_status': getattr(record, 'approval_status', 'pending'),
                })
            return data

        if page is not None:
            return self.get_paginated_response(serialize(page))

        return Response(serialize(queryset))

    @action(detail=False, methods=['get'], url_path='stats')
    def get_attendance_stats(self, request):
        """
        Calculates and returns aggregated attendance statistics based on filters.
        """
        try:
            # Use the helper to get the base filtered queryset
            base_queryset = self._get_filtered_queryset(request.query_params)
            
            # 1. Overall Status Distribution
            status_distribution = base_queryset.aggregate(
                complete=Count('id', filter=Q(check_out__isnull=False) & ~Q(department='NO SHOW')),
                missing_checkout=Count('id', filter=Q(check_out__isnull=True) & ~Q(department='NO SHOW')),
                no_show=Count('id', filter=Q(department='NO SHOW'))
            )
            # Add short duration calculation (optional, could be intensive)
            threshold = timedelta(minutes=5)
            status_distribution['short_duration'] = base_queryset.annotate(
                duration_calc=ExpressionWrapper(F('check_out') - F('check_in'), output_field=DurationField())
            ).filter(
                ~Q(department='NO SHOW'),
                check_out__isnull=False,
                duration_calc__lt=threshold
            ).count()
            # Adjust complete count
            status_distribution['complete'] -= status_distribution['short_duration']
            
            # Format for pie chart
            pie_chart_data = [
                {'name': 'Complete', 'value': status_distribution.get('complete', 0)},
                {'name': 'Missing Check-Out', 'value': status_distribution.get('missing_checkout', 0)},
                {'name': 'No Show', 'value': status_distribution.get('no_show', 0)},
                {'name': 'Short Duration (<5min)', 'value': status_distribution.get('short_duration', 0)},
            ]

            # 2. Attendance by Department (Present only)
            department_stats = base_queryset.exclude(department='NO SHOW') \
                                      .values('department') \
                                      .annotate(count=Count('id')) \
                                      .order_by('-count')
            bar_chart_data = list(department_stats)

            # 3. Daily Attendance Trend (Present only)
            # Group by date and count
            daily_trend = base_queryset.exclude(department='NO SHOW') \
                                  .annotate(date=TruncDate('check_in')) \
                                  .values('date') \
                                  .annotate(count=Count('id')) \
                                  .order_by('date')
            
            # Format for line chart
            line_chart_data = [
                {'date': item['date'].strftime('%Y-%m-%d'), 'count': item['count']} 
                for item in daily_trend
            ]

            # Clean department names in stats output
            prefix = "Atlantis Fishing Development Corp\\"
            for item in bar_chart_data:
                dept = item.get('department', '')
                if dept.startswith(prefix):
                    item['department'] = dept[len(prefix):]

            return Response({
                'status_distribution': pie_chart_data,
                'department_summary': bar_chart_data,
                'daily_trend': line_chart_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error calculating attendance stats: {str(e)}")
            return Response({'error': f'Failed to calculate stats: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get attendance summary statistics for a given date range.
        Calculates employees present, total employees, and trend vs previous period.
        """
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        # --- Date Handling --- 
        try:
            if not start_date_str or not end_date_str:
                today = date.today()
                start_date = today.replace(day=1)
                end_date = (start_date + relativedelta(months=1)) - timedelta(days=1)
            else:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        # --- Calculate Previous Period Dates --- 
        period_duration = end_date - start_date
        prev_start_date = start_date - (period_duration + timedelta(days=1))
        prev_end_date = start_date - timedelta(days=1)
        
        # Special handling for monthly/yearly periods
        if start_date == start_date.replace(day=1) and end_date == (start_date + relativedelta(months=1)) - timedelta(days=1):
             prev_month_date = start_date - relativedelta(months=1)
             prev_start_date = prev_month_date.replace(day=1)
             prev_end_date = (prev_start_date + relativedelta(months=1)) - timedelta(days=1)
        elif start_date == start_date.replace(day=1, month=1) and end_date == end_date.replace(day=31, month=12):
            prev_year_date = start_date - relativedelta(years=1)
            prev_start_date = prev_year_date.replace(day=1, month=1)
            prev_end_date = prev_year_date.replace(day=31, month=12)

        # --- Calculations --- 
        # Base queryset excluding NO SHOW
        base_queryset = Attendance.objects.exclude(department='NO SHOW')
        
        # Employees present in the current period (unique count)
        current_present_count = base_queryset.filter(
            check_in__date__gte=start_date,
            check_in__date__lte=end_date
        ).values('employee_id').distinct().count()
        
        # Employees present in the previous period (unique count)
        previous_present_count = base_queryset.filter(
            check_in__date__gte=prev_start_date,
            check_in__date__lte=prev_end_date
        ).values('employee_id').distinct().count()
        
        # Get the total unique employees who have ever had attendance records
        # This gives a more accurate count of the total employee base
        total_employees = Attendance.objects.values('employee_id').distinct().count()
        
        # If no attendance records exist, fall back to active employees in EmployeeProfile
        if total_employees == 0:
            total_employees = EmployeeProfile.objects.filter(is_active=True).count()
            
        # Ensure total is never less than present count (logical consistency)
        if total_employees < current_present_count:
            total_employees = current_present_count

        # --- Trend Calculation --- 
        trend = current_present_count - previous_present_count
        # Avoid division by zero for percentage
        trend_percentage = 0
        if previous_present_count > 0:
             trend_percentage = round((trend / previous_present_count) * 100, 1)

        # --- Response --- 
        return Response({
            'present_today': current_present_count, # Renamed for clarity (means present in period)
            'total_employees': total_employees,
            'attendance_trend': trend_percentage, # Trend percentage
            # Add raw previous count if needed by frontend
            'previous_present_count': previous_present_count 
        })

    @action(detail=False, methods=['get'], url_path='departments')
    def departments(self, request):
        prefix = "Atlantis Fishing Development Corp\\"

        profile_departments = list(
            EmployeeProfile.objects.values_list('department', flat=True).distinct()
        )
        attendance_departments = list(
            Attendance.objects.values_list('department', flat=True).distinct()
        )
        shift_departments = list(
            EmployeeShift.objects.values_list('department', flat=True).distinct()
        )
        dept_shift_departments = list(
            DepartmentShift.objects.values_list('department', flat=True).distinct()
        )

        all_departments = (
            profile_departments
            + attendance_departments
            + shift_departments
            + dept_shift_departments
        )

        cleaned_departments = set()
        for dept in all_departments:
            if not dept:
                continue
            # Strip prefix for the list returned to the frontend
            if dept.startswith(prefix):
                dept = dept[len(prefix):]
            cleaned_departments.add(dept)

        known_departments = []
        cleaned_departments.update(known_departments)

        final_departments = sorted(
            d for d in cleaned_departments if d and not d.isdigit()
        )

        # Return response in the format expected by the frontend
        return Response({'departments': final_departments})

    @action(detail=False, methods=['post'], url_path='bulk_delete', permission_classes=[IsAuthenticated])
    def bulk_delete(self, request):
        """
        Bulk delete attendance records based on filters.
        Accepts: employee_id, department, start_date, end_date, month, dry_run
        """
        user = request.user
        if not (user.is_superuser or user.groups.filter(name='HR').exists()):
            return Response({'error': 'Permission denied'}, status=403)

        params = request.data
        employee_id = params.get('employee_id')
        department = params.get('department')
        start_date = params.get('start_date')
        end_date = params.get('end_date')
        month = params.get('month')
        dry_run = params.get('dry_run', False)

        queryset = Attendance.objects.all()

        if month:
            try:
                dt = datetime.strptime(month, '%Y-%m')
                start_date = dt.replace(day=1).strftime('%Y-%m-%d')
                end_date_dt = (dt.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
                end_date = end_date_dt.strftime('%Y-%m-%d')
            except Exception:
                pass

        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if department:
            queryset = queryset.filter(department=department)
        if start_date:
            queryset = queryset.filter(check_in__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(check_in__date__lte=end_date)

        count = queryset.count()

        if dry_run:
            return Response({'deleted_count': count, 'dry_run': True})

        deleted, _ = queryset.delete()

        # TODO: Log this deletion in ImportLog or a new audit model

        return Response({'deleted_count': deleted, 'dry_run': False})

    def get_metadata(self, request):
        metadata = super().get_metadata(request)

        # Remove the complex, potentially redundant department choice injection.
        # Let django-filter handle metadata based on the FilterSet definition.
        # prefix = "Atlantis Fishing Development Corp\\"
        # profile_departments = list(
        #     EmployeeProfile.objects.values_list('department', flat=True).distinct()
        # )
        # attendance_departments = list(
        #     Attendance.objects.values_list('department', flat=True).distinct()
        # )
        # shift_departments = list(
        #     EmployeeShift.objects.values_list('department', flat=True).distinct()
        # )
        # dept_shift_departments = list(
        #     DepartmentShift.objects.values_list('department', flat=True).distinct()
        # )
        # all_departments = (
        #     profile_departments
        #     + attendance_departments
        #     + shift_departments
        #     + dept_shift_departments
        # )
        # cleaned_departments = set()
        # for dept in all_departments:
        #     if not dept:
        #         continue
        #     if dept.startswith(prefix):
        #         dept = dept[len(prefix):]
        #     cleaned_departments.add(dept)
        # known_departments = ['Driver', 'Office', 'Harvester', 'Operator', 'Sales', 'Admin', 'HR']
        # cleaned_departments.update(known_departments)
        # final_departments = sorted(
        #     d for d in cleaned_departments if d and not d.isdigit()
        # )
        # if 'actions' in metadata and 'GET' in metadata['actions']:
        #     get_action = metadata['actions']['GET']
        #     if 'department' in get_action:
        #         get_action['department']['choices'] = [
        #             {'value': d, 'display_name': d} for d in final_departments
        #         ]
        #     if hasattr(self, 'filterset_class') and self.filterset_class:
        #         try:
        #             filterset = self.filterset_class(request=request, queryset=self.get_queryset())
        #             if 'department' in filterset.filters and 'choices' in filterset.filters['department'].extra:
        #                  filterset.filters['department'].extra['choices'] = [(d, d) for d in final_departments]
        #                  if 'filters' in metadata:
        #                      metadata['filters']['department']['choices'] = [
        #                          {'value': d, 'display_name': d} for d in final_departments
        #                      ]
        #         except Exception as e:
        #             print(f"Error updating filter metadata: {e}")

        return metadata

class ImportLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for Import Logs
    """
    queryset = ImportLog.objects.all().order_by('-import_date')
    serializer_class = ImportLogSerializer 

class EmployeeShiftViewSet(ModelViewSet):
    """API endpoint for managing employee shift configurations"""
    queryset = EmployeeShift.objects.all()
    lookup_field = 'employee_id'
    http_method_names = ['get', 'post', 'put', 'delete']  # Explicitly allow PUT method
    
    def retrieve(self, request, employee_id=None):
        """Get shift configuration for an employee"""
        try:
            # First try to get employee's shift configuration
            shift = EmployeeShift.objects.get(employee_id=employee_id)
            
            # If using department settings, try to get department configuration
            if shift.use_department_settings and shift.department:
                try:
                    dept_shift = DepartmentShift.objects.get(department=shift.department)
                    return Response({
                        'shift_start': dept_shift.shift_start.strftime('%H:%M'),
                        'shift_end': dept_shift.shift_end.strftime('%H:%M'),
                        'break_duration': dept_shift.break_duration,
                        'is_night_shift': dept_shift.is_night_shift,
                        'is_rotating_shift': dept_shift.is_rotating_shift,
                        'shift_duration': dept_shift.shift_duration,
                        'use_department_settings': True,
                        'department': shift.department
                    })
                except DepartmentShift.DoesNotExist:
                    pass
            
            # Return employee's own configuration
            return Response({
                'shift_start': shift.shift_start.strftime('%H:%M'),
                'shift_end': shift.shift_end.strftime('%H:%M'),
                'break_duration': shift.break_duration,
                'is_night_shift': shift.is_night_shift,
                'is_rotating_shift': shift.is_rotating_shift,
                'rotation_partner_id': shift.rotation_partner_id,
                'shift_duration': shift.shift_duration,
                'use_department_settings': shift.use_department_settings,
                'department': shift.department
            })
        except EmployeeShift.DoesNotExist:
            # Try to get employee's department from profile
            try:
                profile = EmployeeProfile.objects.get(employee_id=employee_id)
                if profile.department_track_shifts:
                    try:
                        dept_shift = DepartmentShift.objects.get(department=profile.department)
                        return Response({
                            'shift_start': dept_shift.shift_start.strftime('%H:%M'),
                            'shift_end': dept_shift.shift_end.strftime('%H:%M'),
                            'break_duration': dept_shift.break_duration,
                            'is_night_shift': dept_shift.is_night_shift,
                            'is_rotating_shift': dept_shift.is_rotating_shift,
                            'shift_duration': dept_shift.shift_duration,
                            'use_department_settings': True,
                            'department': profile.department
                        })
                    except DepartmentShift.DoesNotExist:
                        pass
            except EmployeeProfile.DoesNotExist:
                pass
            
            # Return default configuration
            return Response({
                'shift_start': '06:00',
                'shift_end': '16:00',
                'break_duration': 2,
                'is_night_shift': False,
                'is_rotating_shift': False,
                'shift_duration': 8,
                'use_department_settings': True,
                'department': None
            })
    
    def create(self, request, employee_id=None):
        """Create or update shift configuration for an employee"""
        try:
            shift_data = request.data.copy()
            
            # If using department settings, get the department from profile
            if shift_data.get('use_department_settings'):
                try:
                    profile = EmployeeProfile.objects.get(employee_id=employee_id)
                    shift_data['department'] = profile.department
                except EmployeeProfile.DoesNotExist:
                    pass
            
            shift, created = EmployeeShift.objects.update_or_create(
                employee_id=employee_id,
                defaults=shift_data
            )
            
            # If this is a rotating shift, ensure partner configuration is updated
            if shift_data.get('is_rotating_shift') and shift_data.get('rotation_partner_id'):
                partner_shift, _ = EmployeeShift.objects.get_or_create(
                    employee_id=shift_data['rotation_partner_id']
                )
                partner_shift.is_rotating_shift = True
                partner_shift.rotation_partner_id = employee_id
                partner_shift.shift_duration = 12
                partner_shift.save()
            
            return Response(status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def update(self, request, employee_id=None, *args, **kwargs):
        """Update shift configuration for an employee"""
        try:
            shift_data = request.data.copy()
            
            # If using department settings, get the department from profile
            if shift_data.get('use_department_settings'):
                try:
                    profile = EmployeeProfile.objects.get(employee_id=employee_id)
                    shift_data['department'] = profile.department
                except EmployeeProfile.DoesNotExist:
                    pass
            
            # Get or create the shift
            shift, created = EmployeeShift.objects.update_or_create(
                employee_id=employee_id,
                defaults=shift_data
            )
            
            # If this is a rotating shift, ensure partner configuration is updated
            if shift_data.get('is_rotating_shift') and shift_data.get('rotation_partner_id'):
                partner_shift, _ = EmployeeShift.objects.get_or_create(
                    employee_id=shift_data['rotation_partner_id']
                )
                partner_shift.is_rotating_shift = True
                partner_shift.rotation_partner_id = employee_id
                partner_shift.shift_duration = 12
                partner_shift.save()
            
            return Response(status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def check_shift_status(self, request, employee_id=None):
        """
        Check the shift status for a specific check-in time
        Query params:
        - check_in_time: ISO format datetime string
        - include_previous: Boolean to include previous records check
        """
        try:
            shift = self.get_object()
            check_in_time = request.query_params.get('check_in_time')
            include_previous = request.query_params.get('include_previous', 'false').lower() == 'true'
            
            if not check_in_time:
                return Response(
                    {'error': 'check_in_time parameter is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get previous records if needed
            previous_records = None
            if include_previous:
                check_in_datetime = datetime.fromisoformat(check_in_time)
                previous_records = Attendance.objects.filter(
                    employee_id=employee_id,
                    check_in__date=check_in_datetime.date()
                ).order_by('check_in')
            
            # Get shift period
            shift_start, shift_end = shift.get_shift_period(check_in_time)
            
            # Check if within shift
            is_within = shift.is_within_shift(
                datetime.fromisoformat(check_in_time),
                previous_records
            )
            
            # Get shift type
            shift_type = shift.get_shift_type(datetime.fromisoformat(check_in_time))
            
            return Response({
                'is_within_shift': is_within,
                'shift_type': shift_type,
                'shift_period': {
                    'start': shift_start.isoformat(),
                    'end': shift_end.isoformat()
                }
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class EmployeeProfileViewSet(ModelViewSet):
    """API endpoint for managing employee profiles"""
    queryset = EmployeeProfile.objects.all()
    serializer_class = EmployeeProfileSerializer
    lookup_field = 'employee_id'
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['employee_id', 'full_name']

    def get_queryset(self):
        queryset = super().get_queryset()
        department = self.request.query_params.get('department', None)
        is_active = self.request.query_params.get('is_active', None)
        
        if department:
            queryset = queryset.filter(department=department)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active == 'true')
            
        return queryset.order_by('employee_id')

    def get_object(self):
        """Get or create profile for employee"""
        employee_id = self.kwargs[self.lookup_field]
        try:
            return self.queryset.get(employee_id=employee_id)
        except EmployeeProfile.DoesNotExist:
            try:
                attendance = Attendance.objects.filter(
                    employee_id=employee_id,
                    employee_name__isnull=False
                ).order_by('-check_in').first()
                
                if attendance and attendance.employee_name:
                    return EmployeeProfile.objects.create(
                        employee_id=employee_id,
                        full_name=attendance.employee_name,
                        department=attendance.department,
                        is_active=True,
                        date_joined=attendance.check_in.date()
                    )
                else:
                    try:
                        emp_id = int(employee_id)
                        if 1 <= emp_id <= 20:
                            return EmployeeProfile.objects.create(
                                employee_id=employee_id,
                                full_name=f"Employee {employee_id}",
                                department="Unassigned",
                                is_active=True,
                                date_joined=timezone.now().date()
                            )
                        else:
                            raise Http404(f"Invalid employee ID: {employee_id}")
                    except ValueError:
                        raise Http404(f"Invalid employee ID format: {employee_id}")
            except Exception as e:
                print(f"Error creating profile for employee {employee_id}: {str(e)}")
                raise Http404(f"Could not create profile for employee {employee_id}")

    @action(detail=True, methods=['POST'], parser_classes=[MultiPartParser])
    def upload_photo(self, request, employee_id=None):
        """Upload or update employee photo"""
        try:
            profile = self.get_object()
            
            print(f"\n=== Processing photo upload for employee {employee_id} ===")
            print(f"Current profile photo: {profile.photo.name if profile.photo else 'None'}")
            print(f"Request FILES: {request.FILES}")
            
            if 'photo' not in request.FILES:
                print("No photo file found in request")
                return Response(
                    {'error': 'No photo file provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            photo_file = request.FILES['photo']
            print(f"\nReceived file details:")
            print(f"- Name: {photo_file.name}")
            print(f"- Size: {photo_file.size} bytes")
            print(f"- Content type: {photo_file.content_type}")
            
            # Validate file type
            allowed_types = ['image/jpeg', 'image/png', 'image/gif']
            if photo_file.content_type not in allowed_types:
                print(f"Invalid file type: {photo_file.content_type}")
                return Response(
                    {'error': 'Invalid file type. Only JPEG, PNG and GIF are allowed.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Validate file size (max 5MB)
            if photo_file.size > 5 * 1024 * 1024:
                print(f"File too large: {photo_file.size} bytes")
                return Response(
                    {'error': 'File too large. Maximum size is 5MB.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Delete old photo if it exists
            if profile.photo:
                old_photo_path = profile.photo.path
                old_photo_name = profile.photo.name
                print(f"\nDeleting old photo:")
                print(f"- Path: {old_photo_path}")
                print(f"- Name: {old_photo_name}")
                
                try:
                    if os.path.exists(old_photo_path):
                        os.remove(old_photo_path)
                        print("- Old photo file deleted successfully")
                    else:
                        print("- Old photo file not found on disk")
                    
                    # Delete the photo field
                    profile.photo.delete(save=False)
                    print("- Old photo field cleared successfully")
                    
                    # Try to remove empty directories
                    photo_dir = os.path.dirname(old_photo_path)
                    if os.path.exists(photo_dir) and not os.listdir(photo_dir):
                        os.rmdir(photo_dir)
                        print(f"- Removed empty directory: {photo_dir}")
                except Exception as e:
                    print(f"- Error during cleanup: {str(e)}")
            
            print("\nSaving new photo...")
            profile.photo = photo_file
            profile.save()
            
            print(f"New photo saved successfully:")
            print(f"- New photo path: {profile.photo.path}")
            print(f"- New photo name: {profile.photo.name}")
            
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
            
        except Exception as e:
            import traceback
            print(f"\nError uploading photo:")
            print(f"- Error message: {str(e)}")
            print(f"- Traceback: {traceback.format_exc()}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['DELETE'])
    def remove_photo(self, request, employee_id=None):
        """Remove employee photo"""
        try:
            profile = self.get_object()
            if profile.photo:
                profile.photo.delete()
                profile.save()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class DepartmentShiftViewSet(ModelViewSet):
    """API endpoint for managing department shift configurations"""
    queryset = DepartmentShift.objects.all()
    serializer_class = DepartmentShiftSerializer
    lookup_field = 'department'

    def retrieve(self, request, department=None):
        """Get shift configurations for a department"""
        try:
            shifts = DepartmentShift.objects.filter(department=department)
            if shifts.exists():
                serializer = self.get_serializer(shifts, many=True)
                return Response(serializer.data)
            
            # Return default configurations for both shifts
            return Response([
                {
                    'department': department,
                    'shift_type': 'morning',
                    'shift_start': '06:00',
                    'shift_end': '18:00',
                    'break_duration': 2,
                    'is_rotating_shift': False,
                    'shift_duration': 12
                },
                {
                    'department': department,
                    'shift_type': 'night',
                    'shift_start': '18:00',
                    'shift_end': '06:00',
                    'break_duration': 2,
                    'is_rotating_shift': False,
                    'shift_duration': 12
                }
            ])
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def create(self, request, department=None):
        """Create or update shift configurations for a department"""
        try:
            shift_data = request.data
            if not isinstance(shift_data, list):
                shift_data = [shift_data]
            
            shifts = []
            for data in shift_data:
                data['department'] = department
                shift, created = DepartmentShift.objects.update_or_create(
                    department=department,
                    shift_type=data.get('shift_type', 'morning'),
                    defaults=data
                )
                shifts.append(shift)
            
            # Update all employee profiles in this department to use department shifts
            EmployeeProfile.objects.filter(department=department).update(
                department_track_shifts=True
            )
            
            serializer = self.get_serializer(shifts, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def update(self, request, department=None):
        """Update shift configurations for a department"""
        return self.create(request, department)

# Add debug view without authentication for testing
@api_view(['GET'])
@permission_classes([AllowAny])
def debug_departments(request):
    """Debug endpoint to get all departments without authentication"""
    # Get departments from ALL employee profiles (both active and inactive)
    profile_departments = list(
        EmployeeProfile.objects
        .exclude(department__isnull=True)
        .exclude(department__exact='')
        .values_list('department', flat=True)
        .distinct()
    )

    # Get ALL departments from attendance records including historical ones
    attendance_departments = list(
        Attendance.objects
        .exclude(department__isnull=True)
        .exclude(department__exact='')
        .exclude(department__exact='NO SHOW')  # Exclude NO SHOW as it's not a real department
        .values_list('department', flat=True)
        .distinct()
    )

    # Also get departments from DepartmentShift
    try:
        shift_departments = list(
            DepartmentShift.objects
            .values_list('department', flat=True)
            .distinct()
        )
    except Exception:
        shift_departments = []

    # Also get departments from EmployeeShift
    try:
        employee_shift_departments = list(
            EmployeeShift.objects
            .exclude(department__isnull=True)
            .exclude(department__exact='')
            .values_list('department', flat=True)
            .distinct()
        )
    except Exception:
        employee_shift_departments = []

    # Add any hardcoded departments that might exist in the codebase
    known_departments = []

    # Combine all department sources and remove duplicates
    all_departments = sorted(set(
        profile_departments + 
        attendance_departments + 
        shift_departments + 
        employee_shift_departments +
        known_departments
    ))
    
    # Print raw data for debugging
    print(f"Profile departments: {profile_departments}")
    print(f"Attendance departments: {attendance_departments}")
    print(f"Shift departments: {shift_departments}")
    print(f"Employee shift departments: {employee_shift_departments}")
    print(f"Combined departments: {all_departments}")
    
    return Response({
        'departments': all_departments,
        'details': {
            'profile_departments': profile_departments,
            'attendance_departments': attendance_departments,
            'shift_departments': shift_departments,
            'employee_shift_departments': employee_shift_departments
        }
    })