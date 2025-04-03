from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, DateFromToRangeFilter, CharFilter, NumberFilter
from django.db.models import Sum, F, Value, DecimalField
from django.db.models.functions import Coalesce

from .models import Sale
from .serializers import SaleSerializer
# from api.permissions import IsAdminOrReadOnly  # Commented out - needs definition
from rest_framework.filters import SearchFilter, OrderingFilter

class SaleFilter(FilterSet):
    sale_date__gte = DateFromToRangeFilter(field_name='sale_date', lookup_expr='gte')
    sale_date__lte = DateFromToRangeFilter(field_name='sale_date', lookup_expr='lte')
    buyer_name__icontains = CharFilter(field_name='buyer__name', lookup_expr='icontains')
    si_number__icontains = CharFilter(field_name='si_number', lookup_expr='icontains')
    
    class Meta:
        model = Sale
        fields = ['status', 'buyer_id', 'sale_date', 'sale_date__gte', 'sale_date__lte', 'buyer_name__icontains', 'si_number__icontains']

class SaleViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Sales.
    """
    queryset = Sale.objects.all().order_by('-sale_date', '-sale_time')
    serializer_class = SaleSerializer
    # permission_classes = [IsAuthenticated, IsAdminOrReadOnly] # Commented out
    permission_classes = [IsAuthenticated] # Use IsAuthenticated for now
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = SaleFilter
    search_fields = ['si_number', 'buyer__name', 'po_number']
    ordering_fields = ['sale_date', 'sale_time', 'si_number', 'status', 'buyer__name', 'total_quantity', 'total_cost', 'payment_status']
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        # Filter queryset
        queryset = self.filter_queryset(self.get_queryset())
        
        # Calculate summary data
        total_count = queryset.count()
        processed_count = queryset.filter(status='processed').count()
        canceled_count = queryset.filter(status='canceled').count()
        error_count = queryset.filter(status='error').count()
        
        # Calculate revenue from processed sales
        total_revenue = queryset.filter(status='processed').aggregate(
            total_revenue=Coalesce(Sum(F('price_per_block') * (F('pickup_quantity') + F('delivery_quantity'))), Value(0), output_field=DecimalField())
        )['total_revenue'] or 0
        
        # Calculate average sale value
        avg_sale_value = 0
        if processed_count > 0:
            avg_sale_value = total_revenue / processed_count
        
        summary_data = {
            'total_sales': total_count,
            'total_revenue': total_revenue,
            'average_sale_value': avg_sale_value,
            'active_count': processed_count,
            'canceled_count': canceled_count,
            'error_count': error_count
        }
        
        return Response(summary_data) 