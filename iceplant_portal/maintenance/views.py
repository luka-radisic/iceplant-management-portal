from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Sum, F, Avg
from django.utils import timezone
from datetime import timedelta
from rest_framework.pagination import PageNumberPagination
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from iceplant_core.group_permissions import IsInGroups, HasModulePermission, ReadOnly

from .models import MaintenanceItem, MaintenanceRecord
from .serializers import MaintenanceItemSerializer, MaintenanceRecordSerializer


# Define a custom permission class for Maintenance module access
class HasMaintenanceModulePermission(HasModulePermission):
    def __init__(self):
        super().__init__(module='maintenance')
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class MaintenanceItemViewSet(viewsets.ModelViewSet):
    """ViewSet for MaintenanceItem model"""
    queryset = MaintenanceItem.objects.all()
    serializer_class = MaintenanceItemSerializer
    pagination_class = StandardResultsSetPagination
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated, HasMaintenanceModulePermission]
    
    def get_queryset(self):
        queryset = MaintenanceItem.objects.all().order_by('-created_at')
        
        # Filter by equipment type if provided
        equipment_type = self.request.query_params.get('equipment_type', None)
        if equipment_type:
            queryset = queryset.filter(equipment_type=equipment_type)
            
        # Filter by location if provided
        location = self.request.query_params.get('location', None)
        if location:
            queryset = queryset.filter(location=location)
            
        # Filter by status if provided
        status = self.request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(status=status)
            
        # Filter items that need maintenance soon
        needs_maintenance = self.request.query_params.get('needs_maintenance', None)
        if needs_maintenance and needs_maintenance.lower() == 'true':
            today = timezone.now().date()
            thirty_days_later = today + timedelta(days=30)
            queryset = queryset.filter(next_maintenance_date__range=[today, thirty_days_later])
            
        return queryset
    
    @action(detail=True, methods=['get'])
    def item_records(self, request, pk=None):
        """
        Return paginated maintenance records for a specific item
        """
        try:
            item = self.get_object()
            records = item.records.all().order_by('-maintenance_date')
            
            # Apply pagination
            page = self.paginate_queryset(records)
            if page is not None:
                serializer = MaintenanceRecordSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = MaintenanceRecordSerializer(records, many=True)
            return Response(serializer.data)
        except MaintenanceItem.DoesNotExist:
            return Response(
                {"error": f"Maintenance item with ID {pk} not found"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """
        Return data for the maintenance dashboard
        """
        today = timezone.now().date()
        
        # Get upcoming maintenance items
        upcoming_maintenance = MaintenanceItem.objects.filter(
            next_maintenance_date__gte=today
        ).order_by('next_maintenance_date')[:5]
        
        # Get recent maintenance records
        recent_maintenance = MaintenanceRecord.objects.all().order_by('-maintenance_date')[:5]
        
        # Get maintenance stats
        total_items = MaintenanceItem.objects.count()
        items_by_status = MaintenanceItem.objects.values('status').annotate(count=Count('id'))
        items_by_type = MaintenanceItem.objects.values('equipment_type').annotate(count=Count('id'))
        
        maintenance_cost = MaintenanceRecord.objects.aggregate(
            total_cost=Sum('cost'),
            avg_cost=Avg('cost')
        )
        
        # Return dashboard data
        return Response({
            'upcomingMaintenance': MaintenanceItemSerializer(upcoming_maintenance, many=True).data,
            'recentMaintenance': MaintenanceRecordSerializer(recent_maintenance, many=True).data,
            'stats': {
                'totalItems': total_items,
                'itemsByStatus': items_by_status,
                'itemsByType': items_by_type,
                'maintenanceCost': maintenance_cost
            }
        })


class MaintenanceRecordViewSet(viewsets.ModelViewSet):
    """ViewSet for MaintenanceRecord model"""
    queryset = MaintenanceRecord.objects.all()
    serializer_class = MaintenanceRecordSerializer
    pagination_class = StandardResultsSetPagination
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated, HasMaintenanceModulePermission]
    
    def get_permissions(self):
        """
        Override to implement different permission levels based on the action:
        - READ operations: Anyone with access to maintenance module can view
        - WRITE operations: Only Maintenance, Operations, and Managers groups
        """
        if self.action in ['list', 'retrieve']:
            # Read-only permissions - anyone with module access
            return [IsAuthenticated(), HasModulePermission('maintenance')]
        else:
            # Write permissions - only specific groups
            return [IsAuthenticated(), IsInGroups(['Maintenance', 'Operations', 'Managers', 'Admins'])]
    
    def get_queryset(self):
        queryset = MaintenanceRecord.objects.all().order_by('-maintenance_date')
        
        # Filter by maintenance item id if provided
        item_id = self.request.query_params.get('item_id', None)
        if item_id:
            queryset = queryset.filter(maintenance_item_id=item_id)
            
        # Filter by maintenance type if provided
        maintenance_type = self.request.query_params.get('maintenance_type', None)
        if maintenance_type:
            queryset = queryset.filter(maintenance_type=maintenance_type)
            
        # Filter by status if provided
        status = self.request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(status=status)

        # Filter by year if provided
        year = self.request.query_params.get('year', None)
        if year:
            try:
                queryset = queryset.filter(maintenance_date__year=int(year))
            except (ValueError, TypeError):
                pass # Ignore invalid year parameter

        # Filter by month if provided
        month = self.request.query_params.get('month', None)
        if month:
            try:
                queryset = queryset.filter(maintenance_date__month=int(month))
            except (ValueError, TypeError):
                pass # Ignore invalid month parameter
            
        # Existing date range filter (keep if needed, but month/year is separate)
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        
        if start_date:
            queryset = queryset.filter(maintenance_date__gte=start_date)
        
        if end_date:
            queryset = queryset.filter(maintenance_date__lte=end_date)
            
        return queryset
    
    @action(detail=False, methods=['post'])
    def clear_history(self, request, pk=None):
        """
        Clear maintenance history for a specific item
        """
        item_id = request.data.get('item_id') or self.kwargs.get('pk')
        
        if not item_id:
            return Response(
                {"error": "No item ID provided"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            MaintenanceRecord.objects.filter(maintenance_item_id=item_id).delete()
            return Response(
                {"message": f"Maintenance history cleared for item {item_id}"},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to clear history: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
