# iceplant_core/api/views.py
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from .serializers import UserSerializer

class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        # run the normal behaviour to validate credentials & create/retrieve a Token
        resp = super().post(request, *args, **kwargs)
        token = Token.objects.get(key=resp.data['token'])
        user = token.user
        user_data = UserSerializer(user).data
        return Response({
            'token': token.key,
            'user': user_data
        })
