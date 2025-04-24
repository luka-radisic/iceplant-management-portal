FROM python:3.11



# Set working directory

WORKDIR /app



# Install Node.js 20.x via NodeSource

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \

    apt-get update && apt-get install -y nodejs && \

       apt-get clean && rm -rf /var/lib/apt/lists/*



       # Copy project files into the container

       COPY . .



       # Remove existing node_modules and lockfile to avoid native module errors

       RUN rm -rf iceplant_portal/frontend/node_modules iceplant_portal/frontend/package-lock.json



       # Install root-level dependencies if needed (safe fallback)

       RUN npm install || true



       # Install backend (Python) dependencies directly (no virtualenv)

       WORKDIR /app/iceplant_portal

       RUN pip install --no-cache-dir -r requirements.txt



       # Ensure 'import os' is present before patching ALLOWED_HOSTS

       RUN grep -q '^import os' iceplant_core/settings.py || sed -i '1s/^/import os\n/' iceplant_core/settings.py

       RUN sed -i "s/ALLOWED_HOSTS = \[\]/ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')/" iceplant_core/settings.py



       # Install frontend dev dependencies and type declarations

       WORKDIR /app/iceplant_portal/frontend

       RUN npm install --save-dev @types/node



       # Create a relaxed tsconfig override to skip strict checking in Docker

       RUN echo '{\n\

         "extends": "./tsconfig.json",\n\

           "compilerOptions": {\n\

              "noEmit": true,\n\

                 "allowJs": true,\n\

                  .  . "skipLibCheck": true\n\

                    }\n\

                    }' > tsconfig.docker.json



                    # Build the frontend with skipped TS checks (just Vite build)

                    RUN echo '#!/bin/bash\n\

                    echo "Building with relaxed TypeScript config..."\n\

                    export NODE_OPTIONS="--max-old-space-size=4096"\n\

                    npx tsc --project tsconfig.docker.json || echo "TypeScript warnings skipped"\n\

                    npx vite build\n' > docker-build.sh && \

                     chmod +x docker-build.sh && \

                       ./docker-build.sh



                       # Create entrypoint script to run backend and frontend

                       WORKDIR /app

                       RUN echo '#!/bin/bash\n\

                       cd /app/iceplant_portal\n\

                       python manage.py migrate\n\

                       python manage.py runserver 0.0.0.0:8000 &\n\

                       \n\

                       cd /app/iceplant_portal/frontend\n\

                       export NODE_OPTIONS="--max-old-space-size=4096"\n\

                       npm run dev &\n\

                       \n\

                       wait\n' > /app/docker-entrypoint.sh



                       RUN chmod +x /app/docker-entrypoint.sh



                       # Expose backend and frontend ports

                       EXPOSE 8000 5173



                       # Default command

                       CMD ["/app/docker-entrypoint.sh"]