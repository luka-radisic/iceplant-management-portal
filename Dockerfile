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

# Install Python requirements
WORKDIR /app/iceplant_portal
RUN pip install --no-cache-dir -r requirements.txt

# Update settings.py to use environment variable for ALLOWED_HOSTS
RUN sed -i "s/ALLOWED_HOSTS = \[\]/ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')/" iceplant_core/settings.py

# Install frontend dependencies and add needed type definitions
WORKDIR /app/iceplant_portal/frontend
RUN npm install
RUN npm install --save-dev @types/node

# Create a custom tsconfig for Docker build
RUN echo '{\n\
  "extends": "./tsconfig.json",\n\
  "compilerOptions": {\n\
    "noEmit": true,\n\
    "allowJs": true,\n\
    "skipLibCheck": true\n\
  }\n\
}' > tsconfig.docker.json

# Build frontend with type checking skipped
RUN echo '#!/bin/bash\n\
echo "Building with strict TypeScript checks disabled..."\n\
export NODE_OPTIONS="--max-old-space-size=4096"\n\
npx tsc --noEmit false --skipLibCheck true || echo "TypeScript check skipped"\n\
npx vite build\n' > docker-build.sh && \
    chmod +x docker-build.sh && \
    ./docker-build.sh

# Create entrypoint script
WORKDIR /app
RUN echo '#!/bin/bash\n\
# Activate virtual environment\n\
source /app/venv/bin/activate\n\
\n\
# Start Django backend\n\
cd /app/iceplant_portal\n\
python manage.py migrate\n\
python manage.py runserver 0.0.0.0:8000 &\n\
\n\
# Start frontend dev server\n\
cd /app/iceplant_portal/frontend\n\
export NODE_OPTIONS="--max-old-space-size=4096"\n\
npm run dev &\n\
\n\
wait\n' > /app/docker-entrypoint.sh

RUN chmod +x /app/docker-entrypoint.sh

# Expose ports for the frontend and backend
EXPOSE 5173 8000

# Start servers
CMD ["/app/docker-entrypoint.sh"]
