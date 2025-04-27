# Authentication Troubleshooting Guide

This guide helps resolve common authentication issues with the IcePlant Portal.

## Common Issues and Solutions

### 1. Login Page Returns HTML Instead of JSON

**Problem:** When attempting to login, the API returns HTML instead of JSON, showing error like:
```
SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON
```

**Solutions:**

1. **Fix Vite Proxy Configuration:**
   - Ensure your `vite.config.ts` file properly proxies the authentication endpoint
   - Make sure the regex pattern `^/api-token-auth/` is used to capture the endpoint correctly

2. **Check Backend Endpoint:**
   ```bash
   # Test the backend endpoint directly
   curl -X POST http://localhost:8000/api-token-auth/ \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=yourusername&password=yourpassword"
   ```
   - Should return JSON with a token, not HTML

3. **Restart Development Servers:**
   ```bash
   # Restart docker containers
   docker compose down
   docker compose up --build
   ```

### 2. CORS Issues

**Problem:** Browser console shows CORS errors when making requests.

**Solutions:**
1. Check your Django CORS settings in `settings.py`:
   ```python
   CORS_ALLOWED_ORIGINS = [
       "http://localhost:5173",
       "http://127.0.0.1:5173",
   ]
   ```

2. Make sure the CORS middleware is installed and properly configured:
   ```python
   MIDDLEWARE = [
       # ... other middleware
       'corsheaders.middleware.CorsMiddleware',
       'django.middleware.common.CommonMiddleware',
       # ... other middleware
   ]
   ```

### 3. Authentication Token Not Being Stored

**Problem:** Login works but the token isn't stored or used in subsequent requests.

**Solutions:**
1. Check browser console for any JavaScript errors
2. Verify that `localStorage` is being used correctly:
   ```javascript
   // Check localStorage in browser console
   localStorage.getItem('token')
   ```

3. Ensure your auth service is properly storing the token:
   ```javascript
   // From your login function
   localStorage.setItem('token', response.data.token);
   ```

### 4. Backend Not Recognizing Token

**Problem:** Token is sent in requests but backend responds with 401 Unauthorized.

**Solutions:**
1. Check token format in request headers:
   ```
   Authorization: Token <your-token-here>
   ```

2. Verify Django REST framework is configured correctly:
   ```python
   REST_FRAMEWORK = {
       'DEFAULT_AUTHENTICATION_CLASSES': [
           'rest_framework.authentication.TokenAuthentication',
           # ... other authentication classes
       ],
   }
   ```

3. Check if the token is valid in the database:
   ```bash
   # Open Django shell
   docker exec -it iceplant-portal bash
   cd /app/iceplant_portal
   python manage.py shell
   
   # In the shell
   from rest_framework.authtoken.models import Token
   Token.objects.all()
   ```

### 5. User Permissions Issues

**Problem:** User can authenticate but doesn't have access to certain resources.

**Solutions:**
1. Check user's group membership:
   ```bash
   # In Django shell
   from django.contrib.auth.models import User, Group
   user = User.objects.get(username='your_username')
   user.groups.all()
   ```

2. Verify permissions in views:
   ```python
   # Your views should check permissions
   from rest_framework.permissions import IsAuthenticated, IsAdminUser
   ```

## Debugging Tools

### Frontend Debugging

Add these lines to your API service for debugging:

```javascript
// Add to your API service
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
    });
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);
```

### Backend Debugging

Enable detailed logging in Django:

```python
# Add to settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'INFO',
        },
    },
}
```

## Quick Authentication Test Script

Save this as `test-auth.sh` in your project root:

```bash
#!/bin/bash

# Configuration
API_URL="http://localhost:8000"
USERNAME="administrator"
PASSWORD="your_password"  # Replace with actual password

echo "Testing authentication at $API_URL"

# Test authentication endpoint
TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/api-token-auth/" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$USERNAME&password=$PASSWORD")

echo "Response: $TOKEN_RESPONSE"

# Extract token (assumes JSON response)
TOKEN=$(echo $TOKEN_RESPONSE | sed 's/.*"token":"\([^"]*\)".*/\1/')

if [[ $TOKEN == $TOKEN_RESPONSE ]]; then
  echo "Failed to extract token. Authentication may have failed."
  exit 1
fi

echo "Token obtained: ${TOKEN:0:10}... (truncated)"

# Test authentication with token
echo "Testing authenticated API access..."
curl -s -X GET "$API_URL/api/company/public-info/" \
  -H "Authorization: Token $TOKEN" \
  -H "Content-Type: application/json"

echo ""
echo "Authentication test complete."
```

Make it executable:
```bash
chmod +x test-auth.sh
./test-auth.sh
```

## Contact Support

If you're still experiencing issues after trying these solutions, please reach out to the development team with:

1. Screenshots of the error
2. Browser console logs
3. Backend server logs
4. Steps to reproduce the issue