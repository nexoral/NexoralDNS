# Sourced by Scripts/install.sh — not meant to run standalone.
if [ -z "${NEXORALDNS_CLI_LOADED:-}" ]; then
  echo "This file must be sourced via the nexoraldns CLI, not run directly." >&2
  exit 1
fi

# Install Docker Engine and the Docker Compose plugin on the host if missing.
install_docker_engine() {
  print_status "Checking Docker installation..."

  # Check if Docker is installed
  if ! command -v docker &> /dev/null; then
    print_warning "Docker is not installed. Installing Docker..."

    # Add Docker's official GPG key
    print_status "Updating package repositories..."
    sudo apt-get update > /dev/null 2>&1
    print_status "Installing required packages..."
    sudo apt-get install -y ca-certificates curl > /dev/null 2>&1
    sudo install -m 0755 -d /etc/apt/keyrings
    print_status "Adding Docker's official GPG key..."
    sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc

    # Add the repository to Apt sources
    print_status "Adding Docker repository..."
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update > /dev/null 2>&1

    # Install Docker and Docker Compose plugin
    print_status "Installing Docker and Docker Compose..."
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin > /dev/null 2>&1

    # Add current user to docker group
    print_status "Adding user $USER to docker group..."
    sudo groupadd docker
    sudo usermod -aG docker "$USER"

    # Check if installation was successful
    if ! command -v docker &> /dev/null; then
      print_error "Docker installation failed."
      exit 1
    fi

    print_success "Docker has been installed successfully."
  else
    print_success "Docker is already installed."
  fi

  # Check if Docker Compose is available
  print_status "Checking Docker Compose availability..."
  if ! sudo docker compose version &> /dev/null; then
    print_warning "Docker Compose is not available. Installing Docker Compose plugin..."
    sudo apt-get install -y docker-compose-plugin > /dev/null 2>&1

    if ! sudo docker compose version &> /dev/null; then
      print_error "Docker Compose installation failed."
      exit 1
    fi

    print_success "Docker Compose has been installed successfully."
  else
    print_success "Docker Compose is already available."
  fi
}

# Completely remove Docker Engine, CLI, containerd, and the Compose plugin from the host,
# including data directories, the apt repo/keyring, and the docker group.
purge_docker_completely() {
  print_status "Removing Docker and Docker Compose from this machine..."

  if ! command -v docker &> /dev/null; then
    print_status "Docker is not installed. Nothing to remove."
    return 0
  fi

  # Stop Docker services so files aren't in use during purge
  sudo systemctl stop docker.socket docker containerd 2>/dev/null || true

  print_status "Purging Docker packages..."
  sudo apt-get purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin docker-ce-rootless-extras > /dev/null 2>&1 || true
  sudo apt-get autoremove -y --purge > /dev/null 2>&1 || true

  print_status "Removing Docker data directories..."
  sudo rm -rf /var/lib/docker /var/lib/containerd

  print_status "Removing Docker apt repository and GPG key..."
  sudo rm -f /etc/apt/sources.list.d/docker.list /etc/apt/keyrings/docker.asc
  sudo apt-get update > /dev/null 2>&1 || true

  # Remove the docker group (frees the gid, drops membership records)
  if getent group docker > /dev/null 2>&1; then
    sudo groupdel docker 2>/dev/null || true
  fi

  print_success "Docker and Docker Compose have been removed from this machine."
}
