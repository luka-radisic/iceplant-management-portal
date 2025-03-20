from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth

from expenses.models import Expense
from .serializers import ExpenseSerializer

class ExpenseViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Expense records
    """
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    filterset_fields = ['category', 'vendor', 'purchase_date']
    search_fields = ['description', 'vendor', 'notes']
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get expense summary by category or month
        """
        group_by = request.query_params.get('group_by', 'category')
        
        # Base queryset
        queryset = Expense.objects.all()
        
        # Apply date filtering if provided
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(purchase_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(purchase_date__lte=end_date)
            
        # Group by selected field
        if group_by == 'month':
            summary = queryset.annotate(
                month=TruncMonth('purchase_date')
            ).values('month').annotate(
                total=Sum('amount'),
                count=Count('id')
            ).order_by('month')
        else:  # group by category
            summary = queryset.values('category').annotate(
                total=Sum('amount'),
                count=Count('id')
            ).order_by('-total')
            
        return Response(summary)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """
        Get recent expenses
        """
        limit = int(request.query_params.get('limit', 10))
        queryset = Expense.objects.all().order_by('-purchase_date')[:limit]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data) 