# Django + Vite Login Integration & Superuser Setup

## 1. How Login Works
- The React frontend sends a POST request to `/api-token-auth/` with username and password.
- Django REST Framework (DRF) returns a JSON response with a token if credentials are correct.
- The frontend expects a JSON response (e.g., `{ "token": "..." }`).

## 2. Common Login Error: "Failed to parse JSON response"
This error means the frontend received HTML (often a Django error page) instead of JSON. Causes include:
- Django backend is not running or not accessible.
- `/api-token-auth/` is missing from Django `urls.py`.
- Proxy or CORS misconfiguration between frontend and backend.
- Frontend is pointing to the wrong backend URL.

### How to Fix
1. **Ensure Django is running** at the expected URL (e.g., `http://localhost:8000`).
2. **Check Django `urls.py`:**
   ```python
   from rest_framework.authtoken.views import obtain_auth_token
   urlpatterns = [
       # ...existing code...
       path('api-token-auth/', obtain_auth_token),
       # ...existing code...
   ]
   ```
3. **Check Vite proxy config (`vite.config.js`):**
   ```js
   server: {
     proxy: {
       '/api': 'http://localhost:8000',
       '/api-token-auth/': 'http://localhost:8000',
     }
   }
   ```
4. **CORS settings in Django `settings.py`:**
   ```python
   INSTALLED_APPS = [
       # ...existing code...
       'corsheaders',
       # ...existing code...
   ]
   MIDDLEWARE = [
       'corsheaders.middleware.CorsMiddleware',
       # ...existing code...
   ]
   CORS_ALLOW_ALL_ORIGINS = True  # For testing only
   ```
5. **Restart both backend and frontend** after making changes.

## 3. Create a Django Superuser
1. Open a terminal in your backend directory (`iceplant_portal`).
2. Activate your virtual environment if needed:
   ```bash
   source venv/bin/activate
   ```
3. Run:
   ```bash
   python manage.py createsuperuser
   ```
   - Follow the prompts to set username, email, and password.

## 4. Test Login
- Use the superuser credentials to log in from the frontend.
- If you still see the JSON parse error, check the browser network tab for the actual response from `/api-token-auth/`.

---

**If you need to check or edit your Django or Vite config files, see the project README for file locations.**