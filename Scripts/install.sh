#!/bin/bash

# Request sudo access upfront and keep it alive
echo "This script requires sudo access for Docker installation and management."
sudo -v

# Keep sudo alive by updating timestamp every 60 seconds
while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null &

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo "Docker is not installed. Installing Docker..."
  
  # Add Docker's official GPG key
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl
  sudo install -m 0755 -d /etc/apt/keyrings
  sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  sudo chmod a+r /etc/apt/keyrings/docker.asc

  # Add the repository to Apt sources
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update

  # Install Docker and Docker Compose plugin
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  
  # Check if installation was successful
  if ! command -v docker &> /dev/null; then
    echo "Docker installation failed."
    exit 1
  fi
  
  echo "Docker has been installed successfully."
else
  echo "Docker is already installed."
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
  echo "Docker Compose is not available. Installing Docker Compose plugin..."
  sudo apt-get install -y docker-compose-plugin
  
  if ! docker compose version &> /dev/null; then
    echo "Docker Compose installation failed."
    exit 1
  fi
  
  echo "Docker Compose has been installed successfully."
else
  echo "Docker Compose is already available."
fi

# Create directory if it doesn't exist
DOWNLOAD_DIR="$HOME/ExtraBin"
if [ ! -d "$DOWNLOAD_DIR" ]; then
  echo "Creating directory $DOWNLOAD_DIR..."
  mkdir -p "$DOWNLOAD_DIR"
fi

# Check if docker-compose.yml already exists
COMPOSE_FILE="$DOWNLOAD_DIR/docker-compose.yml"
if [ -f "$COMPOSE_FILE" ]; then
  echo "Existing docker-compose.yml found. Stopping and removing services..."
  cd "$DOWNLOAD_DIR" && sudo docker compose down
  echo "Removing existing docker-compose.yml..."
  rm "$COMPOSE_FILE"
fi

# Download the docker-compose.yml file
echo "Downloading docker-compose.yml from GitHub..."
# Using raw URL for direct download
DOWNLOAD_URL="https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/docker-compose.yml"
curl -L "$DOWNLOAD_URL" -o "$COMPOSE_FILE"

if [ -f "$COMPOSE_FILE" ]; then
  echo "docker-compose.yml has been successfully downloaded to $COMPOSE_FILE"
  echo "Starting Docker Compose services..."
  cd "$DOWNLOAD_DIR" && sudo docker compose up -d
  echo "Services have been started in detached mode."
else
  echo "Failed to download docker-compose.yml"
  exit 1
fi