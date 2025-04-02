from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import MaintenanceItem, MaintenanceRecord
from .serializers import MaintenanceItemSerializer, MaintenanceRecordSerializer

# Create your views here.

class MaintenanceItemViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceItem.objects.all()
    serializer_class = MaintenanceItemSerializer
    permission_classes = [IsAuthenticated]

class MaintenanceRecordViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRecord.objects.all()
    serializer_class = MaintenanceRecordSerializer
    permission_classes = [IsAuthenticated]
