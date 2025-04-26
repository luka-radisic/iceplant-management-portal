from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response

class CustomObtainAuthToken(ObtainAuthToken):
    """
    Enhanced token authentication view that includes user permissions info in the response
    """
    def post(self, request, *args, **kwargs):
        # Use the parent class to validate credentials and get the token
        print("DEBUG: CustomObtainAuthToken - Step 1: Before serializer validation")
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        print("DEBUG: CustomObtainAuthToken - Step 2: Serializer valid")
        user = serializer.validated_data['user']
        print(f"DEBUG: CustomObtainAuthToken - Step 3: User retrieved: {user.username}")
        token, created = Token.objects.get_or_create(user=user)
        print(f"DEBUG: CustomObtainAuthToken - Step 4: Token obtained/created. Created: {created}")
        
        # Get the user's groups
        print("DEBUG: CustomObtainAuthToken - Step 5: Getting user groups")
        groups = user.groups.values_list('name', flat=True)
        user_group = groups[0] if groups else None
        print(f"DEBUG: CustomObtainAuthToken - Step 6: User group: {user_group}")
        
        # Create full name from first_name and last_name if available
        print("DEBUG: CustomObtainAuthToken - Step 7: Creating full name")
        first_name = getattr(user, 'first_name', '')
        last_name = getattr(user, 'last_name', '')
        full_name = f"{first_name} {last_name}".strip()
        print(f"DEBUG: CustomObtainAuthToken - Step 8: Full name: {full_name}")
        
        # Return enhanced response with user info including group information and full name
        print("DEBUG: CustomObtainAuthToken - Step 9: Returning response")
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