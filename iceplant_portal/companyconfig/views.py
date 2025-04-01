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
    settings = CompanySettings.get_settings()
    data = {
        'company_name': settings.company_name,
        'logo_url': settings.logo_url if settings.company_logo else None,
    }
    return Response(data)

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
