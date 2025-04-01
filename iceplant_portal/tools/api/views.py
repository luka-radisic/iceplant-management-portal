from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core import management
from django.http import HttpResponse
from django.utils import timezone
from django.apps import apps
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
import json
import tempfile
import os

from attendance.models import EmployeeProfile # To get department list

class ToolsViewSet(viewsets.ViewSet):
    """
    API endpoint for various application tools like backups.
    """

    @action(detail=False, methods=['get'], url_path='backup/full')
    def backup_full_database(self, request):
        """
        Performs a full database dump using dumpdata and returns it as a JSON file.
        Includes all app data for a complete backup.
        """
        try:
            timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
            filename = f'iceplant_backup_full_{timestamp}.json'
            
            response = HttpResponse(content_type='application/json')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            # Include all relevant apps for a complete backup
            apps_to_backup = [
                'attendance',
                'sales',
                'inventory',
                'expenses',
                'buyers',
                'tools',
                'companyconfig',
                'iceplant_core',
                'auth',           # Users, groups, permissions
                'authtoken',      # API tokens
                'contenttypes',   # Required by Django
                'sessions'        # User sessions
            ]
            
            management.call_command(
                'dumpdata', 
                *apps_to_backup,
                exclude=['contenttypes.contenttype', 'auth.permission'],
                format='json',
                indent=2,
                stdout=response
            )
            
            return response
        except Exception as e:
            print(f"Error during full database backup: {str(e)}")
            return Response({'error': f'Failed to create full backup: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='restore', parser_classes=[MultiPartParser, FormParser, JSONParser])
    def restore_database(self, request):
        """
        Restores database from a backup file uploaded by the user.
        The backup file should be a JSON file created by the backup/full endpoint.
        """
        if 'backup_file' not in request.FILES:
            return Response(
                {'error': 'No backup file provided. Please upload a backup file.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        backup_file = request.FILES['backup_file']
        
        # Validate the file
        if not backup_file.name.endswith('.json'):
            return Response(
                {'error': 'Invalid file format. Please upload a JSON backup file.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            # Create a temporary file to save the uploaded content
            with tempfile.NamedTemporaryFile(delete=False, suffix='.json') as temp_file:
                temp_path = temp_file.name
                for chunk in backup_file.chunks():
                    temp_file.write(chunk)
            
            # Validate the backup file by trying to parse it
            with open(temp_path, 'r') as f:
                try:
                    json.load(f)
                except json.JSONDecodeError as e:
                    os.unlink(temp_path)  # Clean up the temp file
                    return Response(
                        {'error': f'Invalid JSON file: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Attempt to restore the database
            # Note: We're NOT using flush here as it would delete all data first
            # Instead, we'll use the loaddata command which will update or create records
            management.call_command('loaddata', temp_path)
            
            # Clean up the temp file
            os.unlink(temp_path)
            
            return Response({
                'success': True,
                'message': 'Database restored successfully from backup file.'
            })
        except Exception as e:
            # Clean up the temp file if it exists
            if 'temp_path' in locals() and os.path.exists(temp_path):
                os.unlink(temp_path)
                
            print(f"Error during database restore: {str(e)}")
            return Response({
                'error': f'Failed to restore database: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='backup/department')
    def backup_department_data(self, request):
        """
        Backs up data relevant to a specific department.
        Currently includes: Attendance, EmployeeProfile, DepartmentShift.
        Returns data as a JSON file.
        """
        department_name = request.query_params.get('department', None)
        if not department_name:
            return Response({'error': 'Department parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
            filename = f'iceplant_backup_{department_name.replace(" ", "_")}_{timestamp}.json'
            
            backup_data = {}
            
            # Models to include in department backup (add more as needed)
            models_to_backup = [
                ('attendance', 'Attendance'),
                ('attendance', 'EmployeeProfile'),
                ('attendance', 'DepartmentShift'),
                # Add other relevant models here, e.g., ('sales', 'SalesRecord')
            ]
            
            for app_label, model_name in models_to_backup:
                try:
                    model = apps.get_model(app_label=app_label, model_name=model_name)
                    # Check if the model has a 'department' field
                    if hasattr(model, 'department'):
                        queryset = model.objects.filter(department=department_name)
                        # Serialize queryset
                        from django.core.serializers import serialize
                        serialized_data = serialize(format='json', queryset=queryset)
                        # Load the serialized string into a Python list/dict
                        backup_data[f'{app_label}_{model_name}'] = json.loads(serialized_data)
                    elif model_name == 'EmployeeProfile': # Special case for EmployeeProfile if needed
                         queryset = model.objects.filter(department=department_name)
                         from django.core.serializers import serialize
                         serialized_data = serialize(format='json', queryset=queryset)
                         backup_data[f'{app_label}_{model_name}'] = json.loads(serialized_data)
                         
                except Exception as model_error:
                    print(f"Warning: Could not back up {app_label}.{model_name} for department {department_name}: {model_error}")
            
            response = HttpResponse(json.dumps(backup_data, indent=2), content_type='application/json')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
        except Exception as e:
            print(f"Error during department backup for {department_name}: {str(e)}")
            return Response({'error': f'Failed to create department backup: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
