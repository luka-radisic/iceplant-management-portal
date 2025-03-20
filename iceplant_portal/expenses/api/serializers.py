from rest_framework import serializers
from expenses.models import Expense

class ExpenseSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = Expense
        fields = '__all__' 