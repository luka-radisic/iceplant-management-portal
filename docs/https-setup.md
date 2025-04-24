# Setting up HTTPS for IcePlant Management Portal

This guide will help you set up HTTPS for your IcePlant Portal using your domain `cma.atlantis-fishing.com`.

## Prerequisites

- Your domain `cma.atlantis-fishing.com` pointing to your server IP (146.190.201.119)
- SSH access to your DigitalOcean droplet

## Step 1: Set Up DNS Records

1. Log in to your domain registrar or DNS provider
2. Create an A record:
   - Name/Host: `cma` (or use @ if it's the root domain)
   - Value/Points to: `146.190.201.119`
   - TTL: 3600 (or default)

## Step 2: Install Nginx and Certbot

SSH into your droplet and run these commands:

```bash
# Update package lists
apt-get update

# Install Nginx and Certbot with Nginx plugin
apt-get install -y nginx certbot python3-certbot-nginx
```

## Step 3: Configure Nginx as a Reverse Proxy

Create a Nginx configuration file for your site:

```bash
# Create Nginx config file
cat > /etc/nginx/sites-available/iceplant << 'EOF'
server {
    listen 80;
    server_name cma.atlantis-fishing.com;

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

    location /static {
        proxy_pass http://localhost:8000/static;
        proxy_set_header Host $host;
    }

    location /media {
        proxy_pass http://localhost:8000/media;
        proxy_set_header Host $host;
    }
}
EOF
```

## Step 4: Enable the Site Configuration

```bash
# Create a symbolic link to enable the site
ln -s /etc/nginx/sites-available/iceplant /etc/nginx/sites-enabled/

# Test the Nginx configuration
nginx -t

# If the test is successful, restart Nginx
systemctl restart nginx
```

## Step 5: Obtain SSL Certificate with Let's Encrypt

```bash
# Get SSL certificate for your domain
certbot --nginx -d cma.atlantis-fishing.com

# Follow the prompts:
# - Enter your email address
# - Agree to the terms of service
# - Choose whether to redirect HTTP to HTTPS (recommended)
```

Certbot will automatically modify your Nginx configuration to use HTTPS.

## Step 6: Test Your HTTPS Setup

Visit your site using HTTPS:
```
https://cma.atlantis-fishing.com
```

## Step 7: Update CORS Settings in Django

Update the CORS settings in your Django application:

1. Connect to the Docker container:
   ```bash
   docker exec -it iceplant-app bash
   ```

2. Edit the Django settings file:
   ```bash
   cd /app/iceplant_portal/iceplant_core
   nano settings.py
   ```

3. Find the CORS settings and add your domain:
   ```python
   CORS_ALLOWED_ORIGINS = [
       "http://localhost:5173",
       "http://127.0.0.1:5173",
       "https://cma.atlantis-fishing.com",
       "http://cma.atlantis-fishing.com"
   ]
   ```

4. Also update ALLOWED_HOSTS:
   ```python
   ALLOWED_HOSTS = ['localhost', '127.0.0.1', '146.190.201.119', 'cma.atlantis-fishing.com']
   ```

5. Save and restart the application:
   ```bash
   pkill -f runserver
   cd /app/iceplant_portal
   python manage.py runserver 0.0.0.0:8000 &
   ```

You should now have a secure HTTPS-enabled IcePlant Management Portal at https://cma.atlantis-fishing.com!
