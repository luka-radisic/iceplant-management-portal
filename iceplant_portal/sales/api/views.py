from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek

from sales.models import Sale
from .serializers import SaleSerializer

class SaleViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Sales records
    """
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer
    filterset_fields = ['buyer_name', 'payment_method', 'delivery_method', 'brine_level']
    search_fields = ['buyer_name', 'po_number', 'notes']
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get sales summary statistics
        """
        # Get query parameters
        period = request.query_params.get('period', 'daily')
        
        # Base queryset
        queryset = Sale.objects.all()
        
        # Apply date filtering if provided
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(sale_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(sale_date__lte=end_date)
            
        # Group by period
        if period == 'daily':
            queryset = queryset.annotate(period=TruncDate('sale_date'))
        elif period == 'weekly':
            queryset = queryset.annotate(period=TruncWeek('sale_date'))
        else:  # monthly
            queryset = queryset.annotate(period=TruncMonth('sale_date'))
            
        # Aggregate data
        summary = queryset.values('period').annotate(
            total_sales=Count('id'),
            total_blocks=Sum('quantity'),
            level1_blocks=Sum('quantity', filter=Q(brine_level=1)),
            level2_blocks=Sum('quantity', filter=Q(brine_level=2))
        ).order_by('period')
        
        return Response(summary) 