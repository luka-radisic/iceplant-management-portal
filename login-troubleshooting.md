# Frontend Login Troubleshooting Guide

This guide addresses the common login issues with the IcePlant Management Portal, particularly the HTML-instead-of-JSON error when attempting to log in.

## Symptoms

- Login fails with error: `Failed to parse response: <!doctype html>...`
- Browser console shows a 200 status code but with HTML content instead of JSON
- The API endpoint `/api-token-auth/` returns the frontend app's HTML instead of a token

## Cause

This issue typically occurs because:

1. The Vite development server is not correctly proxying the `/api-token-auth/` endpoint to the Django backend
2. The browser is getting the frontend HTML instead of the backend API response 
3. When JSON.parse() runs on HTML content, it fails with a syntax error

## Solution 1: Fix Vite.config.ts

1. Edit the Vite configuration file:

```bash
cd iceplant_portal/frontend
nano vite.config.ts  # or use your preferred editor
```

2. Update the proxy configuration to properly handle the auth token endpoint:

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // Important: The specific auth token endpoint needs to come before more general patterns
      '/api-token-auth/': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/api/': {
        target: 'http://localhost:8000',
        changeOrigin: true, 
        secure: false,
      },
    }
  }
});
```

3. Save the file and restart the Vite development server:

```bash
npm run dev
```

## Solution 2: Use Absolute URLs in Frontend API Calls

If fixing the proxy doesn't work, you can modify your API service to use absolute URLs:

1. Edit your API service file:

```bash
cd iceplant_portal/frontend/src/services
nano api.ts  # or use your preferred editor
```

2. Update the login method to use the full backend URL:

```typescript
const apiService = {
  async login(username: string, password: string) {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    
    // Use absolute URL to bypass Vite proxy
    const response = await axios.post('http://localhost:8000/api-token-auth/', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  },
  // ...rest of service methods
};
```

3. Save the file and restart the Vite development server

## Solution 3: Check Django Backend Configuration

Make sure your Django backend is correctly set up to handle the token authentication endpoint:

1. Verify `urls.py` includes the token endpoint:

```python
# In iceplant_core/urls.py
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    # ...
    path('api-token-auth/', obtain_auth_token, name='api_token_auth'),
    # ...
]
```

2. Check that `rest_framework.authtoken` is in your `INSTALLED_APPS`

3. Verify CORS settings allow requests from your frontend:

```python
# In settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    # ...other origins...
]
```

## Solution 4: Test API Endpoint Directly

To confirm if the backend API is working correctly:

```bash
# Test the API endpoint directly with curl
curl -X POST http://localhost:8000/api-token-auth/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=administrator&password=yourpassword"
```

If this returns a JSON response with a token, then the issue is with the frontend proxy.

## Solution 5: Use Docker with Nginx for Development

For a more production-like setup that avoids proxy issues:

1. Create a development Nginx configuration that routes requests properly
2. Use Docker Compose to run both frontend and backend behind the Nginx server

See the `docker-dev-environment.md` file for detailed instructions.

## Additional Debugging Tips

1. Check network requests in browser dev tools:
   - Look for the request to `/api-token-auth/` 
   - Verify headers, especially Content-Type
   - Examine the full response

2. Try a different browser to rule out cache/cookie issues

3. Clear browser cache and cookies:
   - Chrome: Ctrl+Shift+Delete (Windows/Linux) or Cmd+Shift+Delete (Mac)
   - Firefox: Ctrl+Shift+Delete (Windows/Linux) or Cmd+Shift+Delete (Mac)

4. Run the backend on a different port if there might be a port conflict:
   ```bash
   python manage.py runserver 8001
   ```
   Then update the proxy target in vite.config.ts to http://localhost:8001

## Still Having Issues?

Try completely rebuilding the Docker environment:

```bash
# Completely rebuild Docker environment
docker compose down --rmi all --volumes --remove-orphans
docker compose up --build
```

For further assistance, check the Docker logs:

```bash
docker compose logs -f
```