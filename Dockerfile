FROM python:3.11

# Set working directory
WORKDIR /app

# Install Node.js
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy project files
COPY . .

# Install root-level dependencies from package.json if present
RUN npm install

# Set up Python virtual environment
RUN python -m venv venv
ENV PATH="/app/venv/bin:$PATH"

# Check if iceplant_portal directory exists and set up backend
RUN if [ -d "iceplant_portal" ]; then \
      cd iceplant_portal && \
      if [ -f "requirements.txt" ]; then \
        pip install --no-cache-dir -r requirements.txt; \
      fi && \
      # Set up frontend if it exists
      if [ -d "frontend" ]; then \
        cd frontend && \
        npm install && \
        npm run build; \
      fi \
    fi

# Create entrypoint script - adjust paths based on project structure
RUN echo '#!/bin/bash\n\
# Find Django project directory\n\
if [ -d "/app/iceplant_portal" ] && [ -f "/app/iceplant_portal/manage.py" ]; then\n\
  DJANGO_DIR="/app/iceplant_portal"\n\
  FRONTEND_DIR="/app/iceplant_portal/frontend"\n\
elif [ -f "/app/manage.py" ]; then\n\
  DJANGO_DIR="/app"\n\
  FRONTEND_DIR="/app/frontend"\n\
else\n\
  echo "Cannot find Django project directory"\n\
  exit 1\n\
fi\n\
\n\
# Activate virtual environment\n\
source /app/venv/bin/activate\n\
\n\
# Start Django backend\n\
cd $DJANGO_DIR\n\
python manage.py migrate\n\
python manage.py runserver 0.0.0.0:8000 &\n\
\n\
# Start frontend if it exists\n\
if [ -d "$FRONTEND_DIR" ]; then\n\
  cd $FRONTEND_DIR\n\
  export NODE_OPTIONS="--max-old-space-size=4096"\n\
  npm run dev &\n\
fi\n\
\n\
wait\n' > /app/docker-entrypoint.sh

RUN chmod +x /app/docker-entrypoint.sh

# Expose ports for the frontend and backend
EXPOSE 5173 8000

# Start servers
CMD ["/app/docker-entrypoint.sh"]
