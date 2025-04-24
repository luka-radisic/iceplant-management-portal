# Deployment Confirmation

## Success! Your IcePlant Management Portal is Now Live

The Docker container is up and running on your DigitalOcean droplet. Here's what's available:

- **Frontend**: http://your-server-ip/ (port 80 mapped to container port 5173)
- **Backend/API**: http://your-server-ip:8000/ 
- **Django Admin**: http://your-server-ip:8000/admin/

## Useful Management Commands

### View container logs
To see logs from the running container:

```bash
docker logs -f iceplant-app
```

### Check container resource usage
```bash
docker stats iceplant-app
```

### Execute commands inside the container
```bash
docker exec -it iceplant-app bash
```

### Restart the container
If you need to restart the application:

```bash
docker-compose restart
```

## Next Steps

### 1. Set up a domain name
Configure your domain to point to your server's IP address by creating an A record.

### 2. Set up SSL/HTTPS
Install Nginx and Certbot to secure your site:

```bash
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx
```

Configure Nginx:
```bash
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

ln -s /etc/nginx/sites-available/iceplant /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Get SSL certificate (replace with your domain)
certbot --nginx -d your-domain.com
```

### 3. Set up automatic backups
Consider setting up database backups with a cron job.

### 4. Monitor and update
Regularly check for application updates and security patches.

## Congratulations!
Your IcePlant Management Portal is now successfully deployed to production.
