from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core import management
from django.http import HttpResponse
from django.utils import timezone
from django.apps import apps
import json

from attendance.models import EmployeeProfile # To get department list

class ToolsViewSet(viewsets.ViewSet):
    """
    API endpoint for various application tools like backups.
    """

    @action(detail=False, methods=['get'], url_path='backup/full')
    def backup_full_database(self, request):
        """
        Performs a full database dump using dumpdata and returns it as a JSON file.
        """
        try:
            timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
            filename = f'iceplant_backup_full_{timestamp}.json'
            
            response = HttpResponse(content_type='application/json')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            # Specify all relevant apps - adjust as needed when new apps are added
            apps_to_backup = [
                'attendance', 
                # 'sales', 
                # 'inventory', 
                # 'expenses',
                'auth', # Include auth models (users, groups, permissions)
                'contenttypes' # Required by Django
            ]
            
            management.call_command(
                'dumpdata', 
                *apps_to_backup,
                format='json',
                indent=2,
                stdout=response
            )
            
            return response
        except Exception as e:
            print(f"Error during full database backup: {str(e)}")
            return Response({'error': f'Failed to create full backup: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
