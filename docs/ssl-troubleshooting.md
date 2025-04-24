# SSL Certificate Troubleshooting Guide

## Problem: DNS Verification Failing

The error message indicates that Let's Encrypt cannot reach your server to verify domain ownership. These steps will help you resolve this issue.

## Step 1: Verify DNS Configuration

First, check if your domain is correctly pointing to your server:

```bash
# Use dig to check DNS records
dig cma.atlantis-fishing.com +short

# This should return your server IP (146.190.201.119)
# If it doesn't, or returns nothing, your DNS is not configured correctly
```

If the DNS records are incorrect or not showing your server's IP:

1. Go to your domain registrar or DNS provider
2. Check that you have an A record for `cma` pointing to `146.190.201.119`
3. If you just created this record, wait 1-24 hours for DNS propagation

## Step 2: Check Firewall Settings

Make sure port 80 is open on your DigitalOcean droplet:

```bash
# Check if ufw firewall is active and its rules
sudo ufw status

# If active, ensure port 80 is allowed
sudo ufw allow 80/tcp

# Check other potential firewalls
iptables -L
```

## Step 3: Verify Nginx is Running and Bound to Port 80

```bash
# Check if Nginx is running
systemctl status nginx

# Check which process is using port 80
sudo netstat -tulpn | grep :80

# If docker or another process is using port 80, you need to stop it or reconfigure
```

## Step 4: Test the ACME Challenge Path Locally

```bash
# Create a test file in the ACME challenge directory
sudo mkdir -p /var/www/html/.well-known/acme-challenge/
echo "test" > /var/www/html/.well-known/acme-challenge/test

# Test if Nginx can serve this file
curl http://localhost/.well-known/acme-challenge/test

# Should return "test"
```

## Step 5: Use HTTP Instead of HTTPS for Initial Certificate

```bash
# Stop Nginx
systemctl stop nginx

# Verify port 80 is now free
netstat -tulpn | grep :80

# Create a simple Nginx config for Let's Encrypt verification
cat > /etc/nginx/sites-available/letsencrypt << 'EOF'
server {
    listen 80;
    server_name cma.atlantis-fishing.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 http://$host$request_uri;
    }
}
EOF

ln -sf /etc/nginx/sites-available/letsencrypt /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/iceplant
nginx -t
systemctl start nginx
```

## Step 6: Try the Standalone Authenticator

If Nginx configuration is problematic, try the standalone authenticator:

```bash
# Stop Nginx first
systemctl stop nginx

# Use the standalone authenticator
certbot certonly --standalone -d cma.atlantis-fishing.com

# After getting the certificate, reconfigure Nginx to use it
```

## Step 7: Check for External Connectivity Issues

Sometimes cloud providers or networks block ports or have other restrictions:

```bash
# Install and run a port check tool
apt-get install -y netcat

# Check if port 80 is reachable from the internet
nc -l -p 80

# From another device, try to connect to your server IP on port 80
# If you can't connect, there's likely a network issue
```

## Step 8: Use External Services to Check

Use online services to check if your domain is correctly pointing to your server and if port 80 is accessible:

1. Visit https://dnschecker.org and enter your domain
2. Use https://check-host.net/check-http to test HTTP accessibility
3. Check https://check-your-website.server-daten.de/ for general connectivity issues

After resolving these issues, try running Certbot again:

```bash
certbot --nginx -d cma.atlantis-fishing.com
```
