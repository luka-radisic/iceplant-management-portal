from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import DjangoModelPermissions
from buyers.models import Buyer
from .serializers import BuyerSerializer, BuyerLightSerializer
from uuid import UUID

class BuyerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing Buyer instances.
    """
    queryset = Buyer.objects.all().order_by('name')
    serializer_class = BuyerSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'business_type']
    search_fields = ['name', 'company_name', 'email', 'phone', 'id']
    ordering_fields = ['name', 'created_at', 'updated_at']
    permission_classes = [DjangoModelPermissions]
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Returns only active buyers.
        """
        active_buyers = self.queryset.filter(is_active=True)
        serializer = BuyerLightSerializer(active_buyers, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search_by_id(self, request):
        """
        Searches for a buyer by UUID.
        """
        buyer_id = request.query_params.get('id', None)
        if not buyer_id:
            return Response(
                {"error": "ID parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Validate as UUID format
            uuid_obj = UUID(buyer_id)
            # Try to find a buyer with this ID
            buyer = Buyer.objects.filter(id=uuid_obj).first()
            
            if not buyer:
                return Response(
                    {"error": f"No buyer found with ID: {buyer_id}"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = self.get_serializer(buyer)
            return Response(serializer.data)
            
        except ValueError:
            return Response(
                {"error": "Invalid UUID format"},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def search_or_create(self, request):
        """
        Searches for a buyer by name and creates one if it doesn't exist.
        Also supports lookup by ID if provided.
        """
        name = request.query_params.get('name', None)
        buyer_id = request.query_params.get('id', None)
        
        # If ID is provided, try to find by ID first
        if buyer_id:
            try:
                uuid_obj = UUID(buyer_id)
                buyer = Buyer.objects.filter(id=uuid_obj).first()
                if buyer:
                    serializer = self.get_serializer(buyer)
                    return Response(serializer.data)
            except ValueError:
                # If ID is invalid format, ignore and continue with name search
                pass
        
        # Continue with name search if ID search failed or wasn't attempted
        if not name:
            return Response(
                {"error": "Name parameter is required when ID is not provided or valid"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Try to find an existing buyer with this name
        buyer = Buyer.objects.filter(name__iexact=name).first()
        
        # If no buyer exists, create one with the provided name
        if not buyer:
            buyer = Buyer.objects.create(name=name)
        
        serializer = self.get_serializer(buyer)
        return Response(serializer.data) 