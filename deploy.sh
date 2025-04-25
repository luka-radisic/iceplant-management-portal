#!/bin/bash

# Configuration
IMAGE_NAME=iceplant-portal
TAR_NAME=iceplant-portal.tar
REMOTE_USER=root
REMOTE_HOST=206.189.87.53
REMOTE_DIR=/root

# Step 1: Build the Docker image
echo "Building Docker image..."
docker build --platform=linux/amd64 -t $IMAGE_NAME .

# Step 2: Save the image to a .tar file
echo "Saving Docker image to $TAR_NAME..."
docker save -o $TAR_NAME $IMAGE_NAME

# Step 3: Transfer the image to the remote Droplet
echo "Transferring $TAR_NAME to $REMOTE_USER@$REMOTE_HOST..."
scp $TAR_NAME $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR

# Step 4: SSH into the Droplet to load and run the container
echo "Deploying image on remote server..."
ssh $REMOTE_USER@$REMOTE_HOST << EOF
  docker rm -f $IMAGE_NAME || true
  docker image rm $IMAGE_NAME || true
  docker load -i $REMOTE_DIR/$TAR_NAME
  docker run -d --name $IMAGE_NAME \
    -p 8000:8000 -p 5173:5173 \
    -e DJANGO_ALLOWED_HOSTS="$REMOTE_HOST,localhost,127.0.0.1" \
    $IMAGE_NAME
EOF

echo "Deployment complete. App should be accessible at:"
echo "http://$REMOTE_HOST:5173"
echo "http://$REMOTE_HOST:8000"
echo "Cleaning up..."
rm $TAR_NAME
echo "Done."
echo "Please check the logs if you encounter any issues."
echo "To view logs, run:"
echo "ssh $REMOTE_USER@$REMOTE_HOST 'docker logs -f $IMAGE_NAME'"
