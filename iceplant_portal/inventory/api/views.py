from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import F

from inventory.models import Inventory, InventoryAdjustment
from .serializers import InventorySerializer, InventoryAdjustmentSerializer

class InventoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Inventory items
    """
    queryset = Inventory.objects.all()
    serializer_class = InventorySerializer
    filterset_fields = ['item_name']
    search_fields = ['item_name', 'unit']
    
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """
        Get inventory items with low stock
        """
        low_stock_items = Inventory.objects.filter(
            quantity__lte=F('minimum_level')
        )
        serializer = self.get_serializer(low_stock_items, many=True)
        return Response(serializer.data)

class InventoryAdjustmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Inventory Adjustments
    """
    queryset = InventoryAdjustment.objects.all()
    serializer_class = InventoryAdjustmentSerializer
    filterset_fields = ['inventory', 'adjustment_date']
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """
        Get adjustment history for a specific inventory item
        """
        inventory_id = request.query_params.get('inventory_id')
        if not inventory_id:
            return Response(
                {"error": "inventory_id parameter is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        adjustments = InventoryAdjustment.objects.filter(
            inventory_id=inventory_id
        ).order_by('-adjustment_date')
        
        serializer = self.get_serializer(adjustments, many=True)
        return Response(serializer.data) 