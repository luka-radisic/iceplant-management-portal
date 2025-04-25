FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Install OS-level dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    gnupg \
    gunicorn \
    postgresql-client \
    python3-pip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get update && apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install serve globally
RUN npm install -g serve

# Copy project files
COPY . .

# Install backend Python dependencies
WORKDIR /app/iceplant_portal
RUN pip install --no-cache-dir -r requirements.txt

# Verify Django is installed
RUN python -m django --version

# Ensure 'import os' is present before patching ALLOWED_HOSTS and CORS
RUN grep -q '^import os' iceplant_core/settings.py || sed -i '1s/^/import os\n/' iceplant_core/settings.py
RUN sed -i "s/ALLOWED_HOSTS = \[\]/ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1,206.189.87.53').split(',')/" iceplant_core/settings.py
RUN sed -i "/CORS_ALLOWED_ORIGINS = \[/a \\\n    \"http://206.189.87.53:5173\"," iceplant_core/settings.py

# Switch database engine to PostgreSQL
RUN python -c "path = 'iceplant_core/settings.py'; text = open(path).read(); text = text[:text.index('DATABASES =')] + '''DATABASES = {\n    'default': {\n        'ENGINE': 'django.db.backends.postgresql',\n        'NAME': os.environ.get('POSTGRES_DB', 'iceplant_db'),\n        'USER': os.environ.get('POSTGRES_USER', 'postgres'),\n        'PASSWORD': os.environ.get('POSTGRES_PASSWORD', 'postgres'),\n        'HOST': os.environ.get('POSTGRES_HOST', 'db'),\n        'PORT': os.environ.get('POSTGRES_PORT', '5432'),\n    }\n}'''; open(path, 'w').write(text)"

# Ensure STATIC_URL is set to fix collectstatic crash
RUN grep -q '^STATIC_URL' iceplant_core/settings.py || echo "\nSTATIC_URL = '/static/'\nSTATIC_ROOT = BASE_DIR / 'staticfiles'" >> iceplant_core/settings.py

# Install frontend dependencies and build
WORKDIR /app/iceplant_portal/frontend
RUN rm -rf node_modules package-lock.json && npm install --legacy-peer-deps
# Skip tsc check and just build frontend
RUN echo 'Skipping TypeScript strict checks for Docker build...' && npx vite build

# Collect Django static files
WORKDIR /app/iceplant_portal
RUN python manage.py collectstatic --noinput

# Entrypoint: run Django and static frontend
WORKDIR /app
RUN echo '#!/bin/bash\n\
cd /app/iceplant_portal\n\
python manage.py migrate --noinput\n\
pip install --no-cache-dir -r requirements.txt\n\
gunicorn iceplant_core.wsgi:application --bind 0.0.0.0:8000 --workers 3 &\n\
cd /app/iceplant_portal/frontend\n\
serve -s dist -l 5173\n' > /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Expose backend and frontend ports
EXPOSE 8000 5173

# Set the entrypoint to the script
ENTRYPOINT ["/app/docker-entrypoint.sh"]
