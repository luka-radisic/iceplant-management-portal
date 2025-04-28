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

# Install OpenSSH server
RUN apt-get update && apt-get install -y openssh-server && \
    mkdir /var/run/sshd && \
    echo 'root:root' | chpasswd && \
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config && \
    sed -i 's@session\s*required\s*pam_loginuid.so@session optional pam_loginuid.so@g' /etc/pam.d/sshd && \
    mkdir -p /root/.ssh && chmod 700 /root/.ssh

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

# Expose SSH port
EXPOSE 22

# Start SSH service and keep container running
CMD ["/usr/sbin/sshd", "-D"]

# Ensure STATIC_URL is set to fix collectstatic crash
RUN grep -q '^STATIC_URL' iceplant_core/settings.py || echo "\nSTATIC_URL = '/static/'\nSTATIC_ROOT = BASE_DIR / 'staticfiles'" >> iceplant_core/settings.py

# Install frontend dependencies and build
WORKDIR /app/iceplant_portal/frontend
RUN rm -rf node_modules package-lock.json && npm install --legacy-peer-deps
RUN echo 'Building frontend with Vite...' && npx vite build
RUN ls -la dist || echo "WARNING: dist directory not found after build!"

# Collect Django static files with error handling
WORKDIR /app/iceplant_portal
RUN mkdir -p staticfiles && \
    python -c "from django.core.management import execute_from_command_line; execute_from_command_line(['manage.py', 'collectstatic', '--noinput'])" || \
    echo "WARNING: collectstatic failed - will be retried at runtime"

# Improved entrypoint script with better error handling
WORKDIR /app
RUN echo '#!/bin/bash -e\n\
echo "Starting IcePlant Management Portal"\n\
cd /app/iceplant_portal\n\
echo "Installing dependencies..."\n\
pip install --no-cache-dir -r requirements.txt\n\
echo "Running database migrations..."\n\
python manage.py migrate --noinput\n\
echo "Collecting static files..."\n\
python manage.py collectstatic --noinput || echo "Warning: collectstatic error, but continuing"\n\
echo "Starting Django backend server..."\n\
python manage.py runserver 0.0.0.0:8000 &\n\
echo "Django server started on port 8000"\n\
\n\
cd /app/iceplant_portal/frontend\n\
echo "Checking frontend build directory..."\n\
if [ ! -d "dist" ]; then\n\
  echo "ERROR: Frontend dist directory not found!"\n\
  echo "Attempting to rebuild frontend..."\n\
  npm run build\n\
fi\n\
\n\
echo "Starting frontend server..."\n\
ls -la dist\n\
serve -s dist -l 5173 --no-clipboard --single &\n\
echo "Frontend server started on port 5173"\n\
\n\
echo "All services started. Use http://localhost:5173 to access the application."\n\
wait -n' > /app/docker-entrypoint.sh

RUN chmod +x /app/docker-entrypoint.sh

# Expose backend and frontend ports
EXPOSE 8000 5173

# Set the entrypoint to the script
ENTRYPOINT ["/app/docker-entrypoint.sh"]

