from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from buyers.models import Buyer
from .serializers import BuyerSerializer, BuyerLightSerializer

class BuyerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing Buyer instances.
    """
    queryset = Buyer.objects.all().order_by('name')
    serializer_class = BuyerSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'business_type']
    search_fields = ['name', 'company_name', 'email', 'phone']
    ordering_fields = ['name', 'created_at', 'updated_at']
    
    @action(detail=False, methods=['get'])
    def active(self):
        """
        Returns only active buyers.
        """
        active_buyers = self.queryset.filter(is_active=True)
        serializer = BuyerLightSerializer(active_buyers, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search_or_create(self, request):
        """
        Searches for a buyer by name and creates one if it doesn't exist.
        """
        name = request.query_params.get('name', None)
        if not name:
            return Response(
                {"error": "Name parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Try to find an existing buyer with this name
        buyer = Buyer.objects.filter(name__iexact=name).first()
        
        # If no buyer exists, create one with the provided name
        if not buyer:
            buyer = Buyer.objects.create(name=name)
        
        serializer = self.get_serializer(buyer)
        return Response(serializer.data) 