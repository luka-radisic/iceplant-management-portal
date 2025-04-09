from django.shortcuts import render
from rest_framework import viewsets, status, parsers
from rest_framework.decorators import action, permission_classes, api_view
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny
from .models import CompanySettings
from .serializers import CompanySettingsSerializer

# Create your views here.

@api_view(['GET'])
@permission_classes([AllowAny])
def public_company_info(request):
    """
    Public endpoint to get basic company info including logo without authentication.
    Used for the login page.
    """
    try:
        settings = CompanySettings.get_settings()
        # Get absolute URL for company logo if it exists
        logo_url = None
        if settings.company_logo and hasattr(settings.company_logo, 'url'):
            try:
                logo_url = request.build_absolute_uri(settings.company_logo.url)
            except:
                logo_url = None
        
        data = {
            'company_name': settings.company_name or 'Ice Plant Management Portal',
            'logo_url': logo_url
        }
        return Response(data)
    except Exception as e:
        # Log the error but return a default response instead of an error
        print(f"Error in public_company_info: {str(e)}")
        return Response({
            'company_name': 'Ice Plant Management Portal',
            'logo_url': None
        })

class CompanySettingsViewSet(viewsets.ModelViewSet):
    """
    API endpoint for company settings.
    Provides 'get_settings' action to retrieve the current settings
    """
    queryset = CompanySettings.objects.all()
    serializer_class = CompanySettingsSerializer
    parser_classes = (JSONParser, MultiPartParser, FormParser)  # Enable file uploads and JSON
    
    def get_queryset(self):
        # Ensure we only see the settings instance
        return CompanySettings.objects.all()[:1]
    
    def list(self, request, *args, **kwargs):
        # Override list to just return the single instance
        instance = CompanySettings.get_settings()
        serializer = self.get_serializer(instance, context={'request': request})
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        # Override retrieve to get the settings regardless of the ID provided
        instance = CompanySettings.get_settings()
        serializer = self.get_serializer(instance, context={'request': request})
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        # Override update to update the settings regardless of the ID provided
        instance = CompanySettings.get_settings()
        
        # Print request data for debugging
        print("Request data:", request.data)
        
        # Create a copy of the data without logo fields to avoid validation errors
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        
        # Remove problematic fields
        if 'company_logo' in data and isinstance(data['company_logo'], str):
            data.pop('company_logo')
        if 'logo_url' in data:
            data.pop('logo_url')
        
        # Try to directly update fields
        try:
            # Only update text and number fields
            if 'company_name' in data:
                instance.company_name = data['company_name']
            if 'company_address_line1' in data:
                instance.company_address_line1 = data['company_address_line1']
            if 'company_address_line2' in data:
                instance.company_address_line2 = data['company_address_line2']
            if 'company_city' in data:
                instance.company_city = data['company_city']
            if 'company_state' in data:
                instance.company_state = data['company_state']
            if 'company_postal_code' in data:
                instance.company_postal_code = data['company_postal_code']
            if 'company_country' in data:
                instance.company_country = data['company_country']
            if 'phone_number' in data:
                instance.phone_number = data['phone_number']
            if 'alternate_phone' in data:
                instance.alternate_phone = data['alternate_phone']
            if 'email' in data:
                instance.email = data['email']
            if 'website' in data:
                instance.website = data['website']
            if 'tax_id' in data:
                instance.tax_id = data['tax_id']
            if 'business_registration' in data:
                instance.business_registration = data['business_registration']
            if 'ice_block_weight' in data:
                # Convert to decimal if string
                instance.ice_block_weight = float(data['ice_block_weight'])
            if 'production_capacity' in data:
                instance.production_capacity = int(data['production_capacity'])
            if 'invoice_footer_text' in data:
                instance.invoice_footer_text = data['invoice_footer_text']
            
            # Save the instance
            instance.save()
            
            # Return the serialized data
            serializer = self.get_serializer(instance, context={'request': request})
            return Response(serializer.data)
            
        except Exception as e:
            print("Error updating company settings:", str(e))
            return Response({"error": str(e)}, status=400)
            
        # If we get here, try the serializer approach as a fallback
        serializer = self.get_serializer(instance, data=data, partial=True, context={'request': request})
        
        try:
            serializer.is_valid(raise_exception=False)
            if serializer.errors:
                print("Validation errors:", serializer.errors)
                return Response(serializer.errors, status=400)
            
            self.perform_update(serializer)
            return Response(serializer.data)
        except Exception as e:
            print("Error in serializer update:", str(e))
            return Response({"error": str(e)}, status=400)
    
    def create(self, request, *args, **kwargs):
        # Prevent creating multiple instances
        if CompanySettings.objects.exists():
            return Response(
                {"detail": "Settings already exist. Use PUT or PATCH to update."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().create(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def get_settings(self, request):
        """
        Get the company settings. Creates default settings if none exist.
        """
        settings = CompanySettings.get_settings()
        serializer = self.get_serializer(settings, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_logo(self, request):
        """
        Upload a company logo
        """
        settings = CompanySettings.get_settings()
        
        if 'company_logo' not in request.FILES:
            return Response(
                {"error": "No logo file provided"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        settings.company_logo = request.FILES['company_logo']
        settings.save()
        
        serializer = self.get_serializer(settings)
        return Response(serializer.data)
from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser
from django.db import transaction
from django.contrib.auth import get_user_model
from .models import DeletionLog

class DatabaseDeleteAPIView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, *args, **kwargs):
        user = request.user
        if not user.is_superuser:
            return Response({'error': 'Superuser privileges required.'}, status=403)

        scope = request.data.get('scope')
        backup_confirmed = request.data.get('backup_confirmed')
        buyers_mode = request.data.get('buyers_mode', 'all')

        if scope not in ['sales', 'attendance', 'inventory', 'expenses', 'maintenance', 'buyers', 'all']:
            return Response({'error': 'Invalid scope.'}, status=400)

        if not backup_confirmed:
            return Response({'error': 'Backup confirmation required.'}, status=400)

        try:
            with transaction.atomic():
                deleted = {}

                # Enforce deletion order to avoid ProtectedError
                if scope in ['all', 'inventory']:
                    # 1. Delete Sales first
                    from sales.models import Sale
                    count, _ = Sale.objects.all().delete()
                    deleted['sales'] = count

                    # 2. Delete Buyers second (if not buyers-only scope)
                    if scope != 'buyers':
                        from buyers.models import Buyer
                        count, _ = Buyer.objects.all().delete()
                        deleted['buyers'] = count

                    # 3. Delete Maintenance Records third
                    from maintenance.models import MaintenanceRecord
                    count, _ = MaintenanceRecord.objects.all().delete()
                    deleted['maintenance_records'] = count

                    # 4. Delete Maintenance Equipment fourth
                    from maintenance.models import MaintenanceItem
                    count, _ = MaintenanceItem.objects.all().delete()
                    deleted['maintenance_items'] = count

                    # 5. Delete Inventory fifth
                    from inventory.models import Inventory
                    count, _ = Inventory.objects.all().delete()
                    deleted['inventory'] = count

                    if scope == 'all':
                        # 6. Delete Attendance
                        from attendance.models import Attendance
                        count, _ = Attendance.objects.all().delete()
                        deleted['attendance'] = count

                        # 6b. Delete Employee Profiles
                        from attendance.models import EmployeeProfile
                        count, _ = EmployeeProfile.objects.all().delete()
                        deleted['employee_profiles'] = count

                        # 7. Delete Expenses
                        from expenses.models import Expense
                        count, _ = Expense.objects.all().delete()
                        deleted['expenses'] = count

                elif scope == 'buyers':
                    # Handle buyers deletion separately
                    from buyers.models import Buyer
                    if buyers_mode == 'inactive':
                        count, _ = Buyer.objects.filter(is_active=False).delete()
                    else:
                        count, _ = Buyer.objects.all().delete()
                    deleted['buyers'] = count

                else:
                    # For other scopes, delete independently
                    if scope == 'sales':
                        from sales.models import Sale
                        count, _ = Sale.objects.all().delete()
                        deleted['sales'] = count

                    if scope == 'attendance':
                        from attendance.models import Attendance
                        count, _ = Attendance.objects.all().delete()
                        deleted['attendance'] = count

                        # Also delete Employee Profiles
                        from attendance.models import EmployeeProfile
                        count, _ = EmployeeProfile.objects.all().delete()
                        deleted['employee_profiles'] = count

                    if scope == 'expenses':
                        from expenses.models import Expense
                        count, _ = Expense.objects.all().delete()
                        deleted['expenses'] = count

                    if scope == 'maintenance':
                        from maintenance.models import MaintenanceRecord
                        count, _ = MaintenanceRecord.objects.all().delete()
                        deleted['maintenance'] = count

                    if scope == 'inventory':
                        from inventory.models import Inventory
                        count, _ = Inventory.objects.all().delete()
                        deleted['inventory'] = count

                # Log the deletion
                DeletionLog.objects.create(
                    user=user,
                    scope=scope,
                    details=f"Deleted records: {deleted}"
                )

            from buyers.models import Buyer
            remaining_buyers = Buyer.objects.count()
            return Response({'status': 'success', 'deleted': deleted, 'remaining_buyers': remaining_buyers})
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            return Response({'error': str(e), 'traceback': tb}, status=500)
