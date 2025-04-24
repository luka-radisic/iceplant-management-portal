# Server Setup for IcePlant Management Portal

## Install Docker and Docker Compose

```bash
# Update package lists
apt-get update

# Install required packages
apt-get install -y apt-transport-https ca-certificates curl software-properties-common

# If Docker is not already installed, install it
if ! command -v docker &>/dev/null; then
  # Add Docker repository
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
  add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
  
  # Install Docker
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io
fi

# Install Docker Compose
apt-get install -y docker-compose

# Make sure Docker is running
systemctl start docker
systemctl enable docker

# Verify Docker is working
docker --version
docker-compose --version
```

## Deploy IcePlant Management Portal

```bash
# Create docker-compose.yml file
cat > docker-compose.yml << 'EOF'
version: '3'

services:
  iceplant:
    image: iceplantph/iceplant-portal:latest
    container_name: iceplant-app
    ports:
      - "80:5173"  # Map port 80 to frontend port
      - "8000:8000"  # Backend port
    restart: always
    environment:
      - FRONTEND_PORT=5173
      - BACKEND_PORT=8000
EOF

# Pull and start the container
docker-compose up -d

# Check if the container is running
docker ps
```

## Set Up HTTPS (Optional)

```bash
# Install Nginx and Certbot
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

# Configure Nginx as a reverse proxy
cat > /etc/nginx/sites-available/iceplant << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # Replace with your actual domain

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /admin {
        proxy_pass http://localhost:8000/admin;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# Enable site configuration
ln -s /etc/nginx/sites-available/iceplant /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Get SSL certificate (replace with your domain)
certbot --nginx -d your-domain.com
```

## Maintenance Commands

```bash
# View logs
docker logs iceplant-app

# Restart the container
docker-compose restart

# Update to the latest version
docker pull iceplantph/iceplant-portal:latest
docker-compose down
docker-compose up -d
```
