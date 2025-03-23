import pandas as pd
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import transaction
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from datetime import datetime, timedelta
import pytz
from rest_framework.viewsets import ModelViewSet
import os

from attendance.models import Attendance, ImportLog, EmployeeShift, EmployeeProfile
from .serializers import (
    AttendanceSerializer, 
    ImportLogSerializer, 
    EmployeeProfileSerializer
)

class AttendanceViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Attendance records
    """
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    filterset_fields = ['employee_id', 'department', 'import_date']
    search_fields = ['employee_id', 'department', 'employee_name']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Get date range filters
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        
        # Apply date range filtering if provided
        if start_date:
            queryset = queryset.filter(check_in__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(check_in__date__lte=end_date)
            
        # Get status filter
        status = self.request.query_params.get('status', 'all')
        if status == 'present':
            queryset = queryset.exclude(department='NO SHOW')
        elif status == 'no-show':
            queryset = queryset.filter(department='NO SHOW')
            
        return queryset.order_by('-check_in')
    
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

class EmployeeShiftViewSet(ModelViewSet):
    """API endpoint for managing employee shift configurations"""
    queryset = EmployeeShift.objects.all()
    lookup_field = 'employee_id'
    
    def retrieve(self, request, employee_id=None):
        """Get shift configuration for an employee"""
        try:
            shift = EmployeeShift.objects.get(employee_id=employee_id)
            return Response({
                'shift_start': shift.shift_start.strftime('%H:%M'),
                'shift_end': shift.shift_end.strftime('%H:%M'),
                'break_duration': shift.break_duration,
                'is_night_shift': shift.is_night_shift,
                'is_rotating_shift': shift.is_rotating_shift,
                'rotation_partner_id': shift.rotation_partner_id,
                'shift_duration': shift.shift_duration
            })
        except EmployeeShift.DoesNotExist:
            # Return default configuration based on employee ID
            is_rotating = employee_id in ['1', '8']  # Special handling for employees 1 and 8
            return Response({
                'shift_start': '06:00',
                'shift_end': '18:00' if is_rotating else '16:00',
                'break_duration': 2,
                'is_night_shift': False,
                'is_rotating_shift': is_rotating,
                'rotation_partner_id': '8' if employee_id == '1' else '1' if employee_id == '8' else None,
                'shift_duration': 12 if is_rotating else 8
            })
    
    def create(self, request, employee_id=None):
        """Create or update shift configuration for an employee"""
        try:
            shift_data = {
                'shift_start': request.data['shift_start'],
                'shift_end': request.data['shift_end'],
                'break_duration': request.data['break_duration'],
                'is_night_shift': request.data['is_night_shift'],
                'is_rotating_shift': request.data.get('is_rotating_shift', False),
                'rotation_partner_id': request.data.get('rotation_partner_id'),
                'shift_duration': request.data.get('shift_duration', 8)
            }
            
            # If this is a rotating shift, ensure partner configuration is updated
            if shift_data['is_rotating_shift'] and shift_data['rotation_partner_id']:
                partner_shift, _ = EmployeeShift.objects.get_or_create(
                    employee_id=shift_data['rotation_partner_id']
                )
                partner_shift.is_rotating_shift = True
                partner_shift.rotation_partner_id = employee_id
                partner_shift.shift_duration = 12
                partner_shift.save()
            
            shift, created = EmployeeShift.objects.update_or_create(
                employee_id=employee_id,
                defaults=shift_data
            )
            return Response(status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def update(self, request, employee_id=None):
        """Update shift configuration for an employee"""
        return self.create(request, employee_id)
        
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
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    lookup_field = 'employee_id'

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
            # Try to create profile from attendance records
            try:
                attendance = Attendance.objects.filter(employee_id=employee_id).first()
                if attendance:
                    return EmployeeProfile.objects.create(
                        employee_id=employee_id,
                        full_name=attendance.employee_name or f"Employee {employee_id}",
                        department=attendance.department,
                        is_active=True,
                        date_joined=timezone.now().date()
                    )
            except Exception as e:
                print(f"Error creating profile: {str(e)}")
            # If no attendance record, create basic profile
            return EmployeeProfile.objects.create(
                employee_id=employee_id,
                full_name=f"Employee {employee_id}",
                department="Unassigned",
                is_active=True,
                date_joined=timezone.now().date()
            )

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