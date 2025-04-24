# Deploying IcePlant Management Portal to DigitalOcean

## Installing the DigitalOcean CLI (doctl)

### On macOS
```bash
# Using Homebrew
brew install doctl
```

### On Linux
```bash
# Download the latest release
cd ~/Downloads
wget https://github.com/digitalocean/doctl/releases/download/v1.92.0/doctl-1.92.0-linux-amd64.tar.gz

# Extract the binary
tar xf doctl-1.92.0-linux-amd64.tar.gz

# Move the binary to your PATH
sudo mv doctl /usr/local/bin
```

## Authenticate with DigitalOcean

1. Create an API token in the DigitalOcean control panel:
   - Log in to your DigitalOcean account
   - Go to API → Generate New Token
   - Give it a name like "IcePlant Deployment"
   - Copy the token (you'll only see it once)

2. Authenticate doctl with your token:
```bash
doctl auth init
```

3. Enter your API token when prompted

## Push Your Docker Image to DigitalOcean Container Registry

```bash
# Create a container registry (if you don't have one)
doctl registry create iceplant-registry

# Log in to the registry
doctl registry login

# Tag your image for DigitalOcean's registry
docker tag iceplant-management-portal-iceplant registry.digitalocean.com/iceplant-registry/iceplant-portal:latest

# Push to DigitalOcean
docker push registry.digitalocean.com/iceplant-registry/iceplant-portal:latest
```

## Create a Droplet for Your Application

```bash
# List available droplet sizes
doctl compute size list

# List available regions
doctl compute region list

# Create a droplet with Docker pre-installed
doctl compute droplet create iceplant-portal \
  --region sgp1 \
  --size s-1vcpu-1gb \
  --image docker-20-04 \
  --ssh-keys YOUR_SSH_KEY_FINGERPRINT \
  --wait
```

Replace `YOUR_SSH_KEY_FINGERPRINT` with your SSH key fingerprint. You can get this with:
```bash
doctl compute ssh-key list
```

## SSH Into Your Droplet and Deploy

```bash
# Get your droplet's IP address
doctl compute droplet list

# SSH into the droplet
ssh root@YOUR_DROPLET_IP

# Once logged in, create a docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3'

services:
  iceplant:
    image: registry.digitalocean.com/iceplant-registry/iceplant-portal:latest
    container_name: iceplant-app
    ports:
      - "80:5173"  # Map port 80 to frontend port
      - "8000:8000"  # Backend port
    restart: always
    environment:
      - FRONTEND_PORT=5173
      - BACKEND_PORT=8000
EOF

# Log in to DigitalOcean registry
doctl registry login

# Pull and run the container
docker-compose up -d
```

## Set Up a Domain Name (Optional)

1. Add a domain in DigitalOcean's Networking → Domains section
2. Create an A record pointing to your droplet's IP address
3. Configure your Docker container to use this domain

## Set Up HTTPS with Certbot (Optional)

```bash
# Install certbot
apt-get update
apt-get install certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
certbot --nginx -d yourdomain.com
```

## Monitoring and Maintenance

```bash
# Check container logs
docker logs iceplant-app

# Check container status
docker ps

# Stop the container
docker-compose down

# Restart the container
docker-compose restart

# Update to the latest version (after pushing a new image)
docker-compose pull
docker-compose up -d
```
