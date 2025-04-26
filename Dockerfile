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
RUN sed -i "s/ALLOWED_HOSTS = \[\]/ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1,0.0.0.0').split(',')/" iceplant_core/settings.py

# Safely overwrite DATABASES to use environment variables
# Remove the inline Python script that modifies DATABASES since the settings.py already has correct config
# Removed dynamic patching of DATABASES in settings.py to fix build errors
# Rely on existing DATABASES config in settings.py using environment variables

# Ensure STATIC_URL is set to fix collectstatic crash
RUN grep -q '^STATIC_URL' iceplant_core/settings.py || echo "\nSTATIC_URL = '/static/'\nSTATIC_ROOT = BASE_DIR / 'staticfiles'" >> iceplant_core/settings.py

# Install frontend dependencies and build
WORKDIR /app/iceplant_portal/frontend
RUN rm -rf node_modules package-lock.json && npm install --legacy-peer-deps
RUN echo 'Skipping TypeScript strict checks for Docker build...' && npx vite build

# Collect Django static files
WORKDIR /app/iceplant_portal
RUN python manage.py collectstatic --noinput

# Entrypoint: run Django and static frontend
WORKDIR /app
RUN echo '#!/bin/bash -e\n\
cd /app/iceplant_portal\n\
pip install --no-cache-dir -r requirements.txt\n\
python manage.py migrate --noinput\n\
python manage.py runserver 0.0.0.0:8000 &\n\
cd /app/iceplant_portal/frontend\n\
serve -s dist -l 5173 &\n\
wait -n' > /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Expose backend and frontend ports
EXPOSE 8000 5173

# Set the entrypoint to the script
ENTRYPOINT ["/app/docker-entrypoint.sh"]

