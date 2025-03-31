from rest_framework import serializers
from expenses.models import Expense, ExpenseCategory
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')
        
class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = '__all__'

class ExpenseSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    created_by_details = UserSerializer(source='created_by', read_only=True)
    approved_by_details = UserSerializer(source='approved_by', read_only=True)
    category_object_details = ExpenseCategorySerializer(source='category_object', read_only=True)
    
    class Meta:
        model = Expense
        fields = '__all__'
        
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Format dates for easier frontend handling
        if representation.get('date'):
            representation['date_formatted'] = instance.date.strftime('%b %d, %Y')
        if representation.get('created_at'):
            representation['created_at_formatted'] = instance.created_at.strftime('%b %d, %Y %H:%M')
        if representation.get('updated_at'):
            representation['updated_at_formatted'] = instance.updated_at.strftime('%b %d, %Y %H:%M')
        if representation.get('approved_date'):
            representation['approved_date_formatted'] = instance.approved_date.strftime('%b %d, %Y %H:%M') if instance.approved_date else None
        return representation 