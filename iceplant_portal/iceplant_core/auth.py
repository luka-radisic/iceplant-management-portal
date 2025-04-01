from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response

class CustomObtainAuthToken(ObtainAuthToken):
    """
    Enhanced token authentication view that includes user permissions info in the response
    """
    def post(self, request, *args, **kwargs):
        # Use the parent class to validate credentials and get the token
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        
        # Get the user's groups
        groups = user.groups.values_list('name', flat=True)
        user_group = groups[0] if groups else None
        
        # Create full name from first_name and last_name if available
        first_name = getattr(user, 'first_name', '')
        last_name = getattr(user, 'last_name', '')
        full_name = f"{first_name} {last_name}".strip()
        
        # Return enhanced response with user info including group information and full name
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'email': user.email,
            'is_superuser': user.is_superuser,
            'is_staff': user.is_staff,
            'group': user_group,
            'first_name': first_name,
            'last_name': last_name,
            'full_name': full_name or user.username,  # Fall back to username if no full name
        }) 