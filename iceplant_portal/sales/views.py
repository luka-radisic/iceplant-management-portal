from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, DateFromToRangeFilter, CharFilter, NumberFilter
from django.db.models import Sum, F, Value, DecimalField, Count
from django.db.models.functions import Coalesce, TruncMonth
import calendar # Import calendar module

from .models import Sale
from .serializers import SaleSerializer
# from api.permissions import IsAdminOrReadOnly  # Commented out - needs definition
from rest_framework.filters import SearchFilter, OrderingFilter

class SaleFilter(FilterSet):
    sale_date = DateFromToRangeFilter(field_name='sale_date')
    buyer_name__icontains = CharFilter(field_name='buyer__name', lookup_expr='icontains')
    si_number__icontains = CharFilter(field_name='si_number', lookup_expr='icontains')
    
    class Meta:
        model = Sale
        fields = ['status', 'buyer_id', 'sale_date', 'buyer_name__icontains', 'si_number__icontains']

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
        # Get date range from query parameters, default to current month if not provided
        start_date_str = request.query_params.get('start_date', None)
        end_date_str = request.query_params.get('end_date', None)
        
        # Base queryset - only consider processed sales for revenue/monthly data
        base_queryset = self.filter_queryset(self.get_queryset()).filter(status='processed')

        # Apply date filtering if parameters are provided
        if start_date_str and end_date_str:
            queryset = base_queryset.filter(sale_date__range=[start_date_str, end_date_str])
        else:
            # Default to current month or handle as needed if no dates
            # For simplicity, let's use the base_queryset if no dates are specified
            queryset = base_queryset 
            # Alternatively, you could default to current month:
            # from django.utils import timezone
            # now = timezone.now()
            # start_date = now.replace(day=1)
            # end_date = (start_date + timezone.timedelta(days=32)).replace(day=1) - timezone.timedelta(days=1)
            # queryset = base_queryset.filter(sale_date__range=[start_date.date(), end_date.date()])
            
        # Calculate overall summary data for the period
        total_revenue = queryset.aggregate(
            total=Coalesce(Sum(F('price_per_block') * (F('pickup_quantity') + F('delivery_quantity'))), Value(0), output_field=DecimalField())
        )['total'] or 0

        # Calculate previous period's revenue (simple example: same range last year/month - adjust as needed)
        # This part needs refinement based on the exact definition of "previous_period"
        previous_total_revenue = 0 # Placeholder - implement proper previous period logic if needed

        # Calculate monthly breakdown within the specified range
        monthly_sales = queryset.annotate(
            month_date=TruncMonth('sale_date') # Truncate to month
        ).values(
            'month_date' # Group by month
        ).annotate(
            total=Sum(F('price_per_block') * (F('pickup_quantity') + F('delivery_quantity'))) # Sum sales for the month
        ).order_by(
            'month_date' # Order by month
        )
        
        # Format monthly data for the chart
        formatted_monthly_data = [
            {
                'month': calendar.month_abbr[sale['month_date'].month], # Get short month name
                'total': float(sale['total'] or 0) # Ensure it's a float for chart
            }
            for sale in monthly_sales
        ]
        
        summary_data = {
            'current_total': total_revenue,
            'previous_total': previous_total_revenue, # Include previous period if calculated
            'monthly_data': formatted_monthly_data, # Add monthly breakdown
            # Add other stats if needed (counts etc., calculated from base_queryset maybe?)
            # 'total_sales': queryset.count(), # Count for the period
        }
        
        return Response(summary_data) 