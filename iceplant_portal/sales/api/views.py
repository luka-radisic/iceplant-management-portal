from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import models
# Removed unused Trunc functions for dates, Count not needed here
from django.db.models import Sum, F 
# Import datetime and Decimal
from datetime import timedelta
from decimal import Decimal
# Import itertools for grouping
import itertools

from sales.models import Sale
from .serializers import SaleSerializer

class SaleViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Sales records
    """
    queryset = Sale.objects.all().order_by('sale_date', 'sale_time') # Ensure consistent order for grouping
    serializer_class = SaleSerializer
    filterset_fields = ['si_number', 'sale_date', 'buyer_name', 'status']
    search_fields = ['si_number', 'buyer_name', 'po_number', 'notes']
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get sales summary statistics based on new model structure.
        Calculates total blocks (pickup/delivery) and total payments received.
        Grouping is done in Python to avoid SQLite limitations.
        """
        # Get query parameters
        period = request.query_params.get('period', 'daily')
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        # Base queryset - Filter for processed sales only for summaries/charts
        queryset = Sale.objects.filter(status='processed').order_by('sale_date')
        
        # Apply date filtering if provided
        if start_date_str:
            queryset = queryset.filter(sale_date__gte=start_date_str)
        if end_date_str:
            queryset = queryset.filter(sale_date__lte=end_date_str)

        # Fetch data from DB
        sales_data = list(queryset.values(
            'id', 'sale_date', 'pickup_quantity', 'delivery_quantity', 
            'cash_amount', 'po_amount'
        ))

        # --- Python-based Grouping and Aggregation --- 
        summary_results = []
        
        # Define grouping key function based on period
        def get_grouping_key(sale):
            sale_date = sale['sale_date']
            if period == 'monthly':
                return sale_date.strftime('%Y-%m-01') # Group by first day of month
            elif period == 'weekly':
                # Group by first day of the week (assuming Monday start)
                return (sale_date - timedelta(days=sale_date.weekday())).strftime('%Y-%m-%d')
            else: # daily
                return sale_date.strftime('%Y-%m-%d')

        # Group data by the calculated period key
        grouped_sales = itertools.groupby(sales_data, key=get_grouping_key)

        # Aggregate within each group
        for period_key, group in grouped_sales:
            group_list = list(group) # Consume the iterator
            total_sales = len(group_list)
            
            # Summing up quantities and payments, handling potential None values just in case
            total_blocks_pickup = sum(Decimal(s['pickup_quantity'] or 0) for s in group_list)
            total_blocks_delivery = sum(Decimal(s['delivery_quantity'] or 0) for s in group_list)
            total_cash_received = sum(Decimal(s['cash_amount'] or 0) for s in group_list)
            total_po_received = sum(Decimal(s['po_amount'] or 0) for s in group_list)
            
            total_blocks_sold = total_blocks_pickup + total_blocks_delivery
            total_payments_received = total_cash_received + total_po_received
            
            summary_results.append({
                'period': period_key,
                'total_sales': total_sales,
                'total_blocks_pickup': total_blocks_pickup,
                'total_blocks_delivery': total_blocks_delivery,
                'total_blocks_sold': total_blocks_sold,
                'total_cash_received': total_cash_received,
                'total_po_received': total_po_received,
                'total_payments_received': total_payments_received
            })

        return Response(summary_results) 