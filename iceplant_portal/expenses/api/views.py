from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth, TruncDate
from django.utils import timezone
from datetime import timedelta, datetime, date
from dateutil.relativedelta import relativedelta

from expenses.models import Expense, ExpenseCategory
from .serializers import ExpenseSerializer, ExpenseCategorySerializer

# Custom permission class that allows read access to all authenticated users
class IsAdminUserOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow admin users to edit/create objects.
    Other authenticated users can only view.
    """
    def has_permission(self, request, view):
        # Allow GET, HEAD, OPTIONS for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        
        # Write permissions only for admin or staff
        return bool(request.user and (request.user.is_staff or request.user.is_superuser))

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Expense Categories
    """
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUserOrReadOnly]
    search_fields = ['name', 'description']

class ExpenseViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Expense records
    """
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUserOrReadOnly]
    pagination_class = StandardResultsSetPagination
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
        Get total expenses for a given date range and the preceding period.
        Defaults to the current month if no date range is provided.
        """
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        # --- Date Handling --- 
        try:
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
        
        # Special handling for monthly/yearly periods (same logic as sales view)
        if start_date == start_date.replace(day=1) and end_date == (start_date + relativedelta(months=1)) - timedelta(days=1):
             prev_month_date = start_date - relativedelta(months=1)
             prev_start_date = prev_month_date.replace(day=1)
             prev_end_date = (prev_start_date + relativedelta(months=1)) - timedelta(days=1)
        elif start_date == start_date.replace(day=1, month=1) and end_date == end_date.replace(day=31, month=12):
            prev_year_date = start_date - relativedelta(years=1)
            prev_start_date = prev_year_date.replace(day=1, month=1)
            prev_end_date = prev_year_date.replace(day=31, month=12)

        # --- Aggregations --- 
        base_queryset = Expense.objects.all() # Consider if filtering by 'approved=True' is needed here

        # Current period total aggregation
        current_period_expenses = base_queryset.filter(
            date__gte=start_date,
            date__lte=end_date
        ).aggregate(
            total_amount=Sum('amount', default=0),
            total_ice_plant=Sum('ice_plant_allocation', default=0)
        )
        
        # Previous period total aggregation
        previous_period_expenses = base_queryset.filter(
            date__gte=prev_start_date,
            date__lte=prev_end_date
        ).aggregate(
            total_amount=Sum('amount', default=0),
            total_ice_plant=Sum('ice_plant_allocation', default=0)
        )

        # --- Response --- 
        result = {
            'current_total': current_period_expenses['total_amount'] or 0,
            'current_ice_plant_total': current_period_expenses['total_ice_plant'] or 0,
            'previous_total': previous_period_expenses['total_amount'] or 0,
            'previous_ice_plant_total': previous_period_expenses['total_ice_plant'] or 0,
            # Add other relevant fields if needed, e.g., top categories for the period
        }
        
        return Response(result) 