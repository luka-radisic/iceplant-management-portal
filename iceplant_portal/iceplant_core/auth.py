from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response

print("DEBUG: auth.py file is being processed")

class CustomObtainAuthToken(ObtainAuthToken):
    """
    Enhanced token authentication view that includes user permissions info in the response
    """
    def post(self, request, *args, **kwargs):
        debug_log_path = '/app/iceplant_portal/debug.log'
        with open(debug_log_path, 'a') as f:
            f.write("DEBUG: CustomObtainAuthToken - Method entered\n")
        try:
            # Use the parent class to validate credentials and get the token
            with open(debug_log_path, 'a') as f:
                f.write("DEBUG: CustomObtainAuthToken - Step 1: Before serializer validation\n")
            serializer = self.serializer_class(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            with open(debug_log_path, 'a') as f:
                f.write("DEBUG: CustomObtainAuthToken - Step 2: Serializer valid\n")
            user = serializer.validated_data['user']
            with open(debug_log_path, 'a') as f:
                f.write(f"DEBUG: CustomObtainAuthToken - Step 3: User retrieved: {user.username}\n")
            token, created = Token.objects.get_or_create(user=user)
            with open(debug_log_path, 'a') as f:
                f.write(f"DEBUG: CustomObtainAuthToken - Step 4: Token obtained/created. Created: {created}\n")
            
            # Get the user's groups
            with open(debug_log_path, 'a') as f:
                f.write("DEBUG: CustomObtainAuthToken - Step 5: Getting user groups\n")
            groups = user.groups.values_list('name', flat=True)
            user_group = groups[0] if groups else None
            with open(debug_log_path, 'a') as f:
                f.write(f"DEBUG: CustomObtainAuthToken - Step 6: User group: {user_group}\n")
            
            # Create full name from first_name and last_name if available
            with open(debug_log_path, 'a') as f:
                f.write("DEBUG: CustomObtainAuthToken - Step 7: Creating full name\n")
            first_name = getattr(user, 'first_name', '')
            last_name = getattr(user, 'last_name', '')
            full_name = f"{first_name} {last_name}".strip()
            with open(debug_log_path, 'a') as f:
                f.write(f"DEBUG: CustomObtainAuthToken - Step 8: Full name: {full_name}\n")
            
            # Return enhanced response with user info including group information and full name
            with open(debug_log_path, 'a') as f:
                f.write("DEBUG: CustomObtainAuthToken - Step 9: Returning response\n")
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
        except Exception as e:
            with open(debug_log_path, 'a') as f:
                f.write(f"DEBUG: CustomObtainAuthToken - An error occurred: {type(e).__name__} - {e}\n")
                import traceback
                traceback.print_exc(file=f)
            # Re-raise the exception to see if Django's error handling provides more info
            raise