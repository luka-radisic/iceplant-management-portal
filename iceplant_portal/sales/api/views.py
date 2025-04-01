from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import models
# Removed unused Trunc functions for dates, Count not needed here
from django.db.models import Sum, F 
# Import datetime and Decimal
from datetime import timedelta, datetime, date
from decimal import Decimal
# Import itertools for grouping
import itertools
from dateutil.relativedelta import relativedelta

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
        Supports date range filtering for totals and trends.
        """
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        # --- Date Handling --- 
        try:
            # Default to current month if no dates are provided
            if not start_date_str or not end_date_str:
                today = date.today()
                start_date = today.replace(day=1)
                end_date = (start_date + relativedelta(months=1)) - timedelta(days=1)
            else:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        # --- Calculate Previous Period --- 
        period_duration = end_date - start_date
        prev_start_date = start_date - (period_duration + timedelta(days=1))
        prev_end_date = start_date - timedelta(days=1)
        
        # Special handling for monthly period to get the actual previous month
        if start_date == start_date.replace(day=1) and end_date == (start_date + relativedelta(months=1)) - timedelta(days=1):
             prev_month_date = start_date - relativedelta(months=1)
             prev_start_date = prev_month_date.replace(day=1)
             prev_end_date = (prev_start_date + relativedelta(months=1)) - timedelta(days=1)
             
        # Special handling for yearly period
        elif start_date == start_date.replace(day=1, month=1) and end_date == end_date.replace(day=31, month=12):
            prev_year_date = start_date - relativedelta(years=1)
            prev_start_date = prev_year_date.replace(day=1, month=1)
            prev_end_date = prev_year_date.replace(day=31, month=12)

        # --- Aggregations --- 
        base_queryset = Sale.objects.filter(status='processed')

        # Current period total aggregation
        current_period_sales = base_queryset.filter(
            sale_date__gte=start_date,
            sale_date__lte=end_date
        ).aggregate(
            total_blocks=Sum(F('pickup_quantity') + F('delivery_quantity'), default=0),
            total_amount=Sum(F('cash_amount') + F('po_amount'), default=0)
        )
        
        # Previous period total aggregation
        previous_period_sales = base_queryset.filter(
            sale_date__gte=prev_start_date,
            sale_date__lte=prev_end_date
        ).aggregate(
            total_blocks=Sum(F('pickup_quantity') + F('delivery_quantity'), default=0),
            total_amount=Sum(F('cash_amount') + F('po_amount'), default=0)
        )

        # --- Monthly Data for Charts (using current period filter) --- 
        monthly_queryset = base_queryset.filter(sale_date__gte=start_date, sale_date__lte=end_date)
        sales_data = list(monthly_queryset.values(
            'sale_date', 'cash_amount', 'po_amount'
        ))

        # Group by month (Python-based)
        monthly_data_grouped = {}
        for sale in sales_data:
            month_key = sale['sale_date'].strftime('%Y-%m')
            amount = Decimal(sale['cash_amount'] or 0) + Decimal(sale['po_amount'] or 0)
            monthly_data_grouped[month_key] = monthly_data_grouped.get(month_key, Decimal(0)) + amount

        # Format for frontend chart
        monthly_data_chart = []
        for month_key, total_amount in sorted(monthly_data_grouped.items()):
            try:
                month_date = datetime.strptime(month_key, '%Y-%m')
                month_name = month_date.strftime('%b %Y')
            except:
                month_name = month_key
            monthly_data_chart.append({
                'month': month_name,
                'total': float(total_amount)
            })

        # --- Response --- 
        return Response({
            'current_total': float(current_period_sales['total_amount'] or 0),
            'previous_total': float(previous_period_sales['total_amount'] or 0),
            'current_blocks': int(current_period_sales['total_blocks'] or 0),
            'previous_blocks': int(previous_period_sales['total_blocks'] or 0),
            'monthly_data': monthly_data_chart
        }) 