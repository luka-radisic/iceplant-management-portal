from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth, TruncDate
from django.utils import timezone

from expenses.models import Expense, ExpenseCategory
from .serializers import ExpenseSerializer, ExpenseCategorySerializer

class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Expense Categories
    """
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['name', 'description']

class ExpenseViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Expense records
    """
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['category', 'payee', 'date', 'approved']
    search_fields = ['description', 'payee', 'reference_number', 'notes']
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Approve an expense
        """
        expense = self.get_object()
        if expense.approved:
            return Response({"detail": "Expense already approved"}, status=status.HTTP_400_BAD_REQUEST)
        
        expense.approved = True
        expense.approved_by = request.user
        expense.approved_date = timezone.now()
        expense.save()
        
        serializer = self.get_serializer(expense)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get expense summary by category, month, or date range
        """
        group_by = request.query_params.get('group_by', 'category')
        
        # Base queryset
        queryset = Expense.objects.all()
        
        # Apply date filtering if provided
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
            
        # Apply approval filter if provided
        approved = request.query_params.get('approved')
        if approved is not None:
            approved_bool = approved.lower() == 'true'
            queryset = queryset.filter(approved=approved_bool)
        
        # Group by selected field
        if group_by == 'month':
            summary = queryset.annotate(
                period=TruncMonth('date')
            ).values('period').annotate(
                total=Sum('amount'),
                ice_plant_total=Sum('ice_plant_allocation'),
                count=Count('id')
            ).order_by('period')
        elif group_by == 'date':
            summary = queryset.annotate(
                period=TruncDate('date')
            ).values('period').annotate(
                total=Sum('amount'),
                ice_plant_total=Sum('ice_plant_allocation'),
                count=Count('id')
            ).order_by('period')
        else:  # group by category
            summary = queryset.values('category').annotate(
                total=Sum('amount'),
                ice_plant_total=Sum('ice_plant_allocation'),
                count=Count('id')
            ).order_by('-total')
            
        return Response(summary)
    
    @action(detail=False, methods=['get'])
    def payee_summary(self, request):
        """
        Get expense summary by payee
        """
        # Base queryset
        queryset = Expense.objects.all()
        
        # Apply date filtering if provided
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
            
        summary = queryset.values('payee').annotate(
            total=Sum('amount'),
            ice_plant_total=Sum('ice_plant_allocation'),
            count=Count('id')
        ).order_by('-total')
            
        return Response(summary)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """
        Get recent expenses
        """
        limit = int(request.query_params.get('limit', 10))
        queryset = Expense.objects.all().order_by('-date')[:limit]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def total(self, request):
        """
        Get total expenses for the current month and year
        """
        now = timezone.now()
        current_month = now.month
        current_year = now.year
        
        # Current month total
        monthly_total = Expense.objects.filter(
            date__month=current_month,
            date__year=current_year
        ).aggregate(
            total=Sum('amount'),
            ice_plant_total=Sum('ice_plant_allocation')
        )
        
        # Current year total
        yearly_total = Expense.objects.filter(
            date__year=current_year
        ).aggregate(
            total=Sum('amount'),
            ice_plant_total=Sum('ice_plant_allocation')
        )
        
        # Last 30 days total
        thirty_days_ago = now.date() - timezone.timedelta(days=30)
        thirty_day_total = Expense.objects.filter(
            date__gte=thirty_days_ago
        ).aggregate(
            total=Sum('amount'),
            ice_plant_total=Sum('ice_plant_allocation')
        )
        
        # Top categories for current month
        top_categories = Expense.objects.filter(
            date__month=current_month,
            date__year=current_year
        ).values('category').annotate(
            total=Sum('amount')
        ).order_by('-total')[:5]
        
        result = {
            'monthly_total': monthly_total['total'] or 0,
            'monthly_ice_plant_total': monthly_total['ice_plant_total'] or 0,
            'yearly_total': yearly_total['total'] or 0,
            'yearly_ice_plant_total': yearly_total['ice_plant_total'] or 0,
            'thirty_day_total': thirty_day_total['total'] or 0,
            'thirty_day_ice_plant_total': thirty_day_total['ice_plant_total'] or 0,
            'top_categories': list(top_categories)
        }
        
        return Response(result) 