from django.shortcuts import render
from rest_framework import viewsets, status, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import CompanySettings
from .serializers import CompanySettingsSerializer

# Create your views here.

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
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        # Override retrieve to get the settings regardless of the ID provided
        instance = CompanySettings.get_settings()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        # Override update to update the settings regardless of the ID provided
        instance = CompanySettings.get_settings()
        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False))
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
    
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
        serializer = self.get_serializer(settings)
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
