#!/bin/bash

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# System detection functions
detect_linux() {
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        return 1
    fi
    return 0
}

detect_debian_based() {
    if ! command -v apt &> /dev/null; then
        return 1
    fi
    return 0
}

detect_supported_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        case "$ID" in
            ubuntu|zorin|linuxmint|debian)
                return 0
                ;;
            *)
                return 1
                ;;
        esac
    else
        return 1
    fi
}

# Ensure systemd-resolved is running; if it's not active, start it.
ensure_systemd_resolved_running() {
  if ! command -v systemctl >/dev/null 2>&1; then
    print_warning "systemctl not found; cannot manage systemd-resolved."
    return 2
  fi

  if systemctl is-active --quiet systemd-resolved; then
    print_status "systemd-resolved is already active."
    return 0
  fi

  print_status "systemd-resolved is not active — enabling and restarting service..."
  # First enable the service so it starts automatically at boot
  if sudo systemctl enable systemd-resolved >/dev/null 2>&1; then
    print_status "systemd-resolved enabled for automatic startup at boot."
    # Then restart the service to activate it now
    if sudo systemctl restart systemd-resolved >/dev/null 2>&1; then
      if systemctl is-active --quiet systemd-resolved; then
        print_success "systemd-resolved enabled and started successfully."
        return 0
      fi
    fi
  fi

  print_error "Failed to start systemd-resolved."
  return 1
}

# If systemd-resolved is enabled, disable and stop it (useful when you must free port 53).
disable_systemd_resolved_if_enabled() {
  if ! command -v systemctl >/dev/null 2>&1; then
    print_warning "systemctl not found; cannot manage systemd-resolved."
    return 2
  fi

  local acted=0
  # If the service is active (running) stop it so port 53 is freed
  if systemctl is-active --quiet systemd-resolved 2>/dev/null; then
    print_status "systemd-resolved is active — stopping now to free port 53..."
    if sudo systemctl stop systemd-resolved >/dev/null 2>&1; then
      print_success "systemd-resolved stopped."
      acted=1
    else
      print_error "Failed to stop systemd-resolved."
      return 1
    fi
  fi

  # If the service is enabled, disable it so it doesn't restart at boot
  if systemctl is-enabled --quiet systemd-resolved 2>/dev/null; then
    print_status "systemd-resolved is enabled — disabling now..."
    if sudo systemctl disable systemd-resolved >/dev/null 2>&1; then
      print_success "systemd-resolved disabled."
      acted=1
    else
      print_error "Failed to disable systemd-resolved."
      return 1
    fi
  fi

  if [ $acted -eq 0 ]; then
    print_status "systemd-resolved was neither active nor enabled (nothing to do)."
  fi
  return 0
}

# Update /etc/resolv.conf to use the given nameserver IP.
# Replaces existing nameserver lines and preserves other lines.
set_resolv_nameserver() {
  local ns_ip="$1"
  if [ -z "$ns_ip" ]; then
    print_warning "No nameserver IP provided to set_resolv_nameserver"
    return 1
  fi

  print_status "Updating /etc/resolv.conf nameserver -> $ns_ip"

  # Capture existing non-nameserver lines (if any)
  local rest
  rest=$(sudo grep -vE '^[[:space:]]*nameserver' /etc/resolv.conf 2>/dev/null || true)

  # If it's a symlink (commonly managed by systemd-resolved), replace it with a regular file
  if [ -L /etc/resolv.conf ]; then
    print_warning "/etc/resolv.conf is a symlink; replacing it with a regular file"
    sudo rm -f /etc/resolv.conf
  fi

  # Write the new resolv.conf atomically
  sudo bash -c "printf 'nameserver %s\n' '$ns_ip' > /etc/resolv.conf"

  if [ -n "$rest" ]; then
    printf '%s\n' "$rest" | sudo tee -a /etc/resolv.conf > /dev/null
  fi

  print_success "/etc/resolv.conf updated to use nameserver $ns_ip"
  return 0
}

# Check that required TCP ports are free (default: 4000 and 4773).
# Returns 0 when all ports are free, 1 if any port is in use.
check_ports_free() {
  local ports=(4000 4773)
  local port
  local occupied=0

  for port in "${ports[@]}"; do
    if command -v lsof >/dev/null 2>&1; then
      if sudo lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
        print_error "Port $port is already in use."
        occupied=1
      else
        print_status "Port $port is free."
      fi
    else
      # fallback to ss if lsof isn't available
      if ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq ":[0-9]*:$port$|:$port\b"; then
        print_error "Port $port is already in use."
        occupied=1
      else
        print_status "Port $port is free."
      fi
    fi
  done

  return $occupied
}

# Compare semantic version strings: compare a and b
# returns: 1 if a>b (remote>local), 2 if a<b, 0 if equal
version_compare() {
  local a="$1" b="$2"
  local IFS=.
  local raw1 raw2 i
  local -a ver1 ver2

  # Strip suffix (ignore -beta/-stable)
  raw1="${a%%-*}"
  raw2="${b%%-*}"

  read -ra ver1 <<<"$raw1"
  read -ra ver2 <<<"$raw2"

  # pad shorter array with zeros
  for ((i=${#ver1[@]}; i<${#ver2[@]}; i++)); do ver1[i]=0; done
  for ((i=${#ver2[@]}; i<${#ver1[@]}; i++)); do ver2[i]=0; done

  for ((i=0; i<${#ver1[@]}; i++)); do
    if ((10#${ver1[i]} > 10#${ver2[i]})); then return 1; fi
    if ((10#${ver1[i]} < 10#${ver2[i]})); then return 2; fi
  done
  return 0
}




# Pull required images from registry before stopping system services (so DNS works during pull)
pull_required_images() {
  local images=("mongo:latest" "redis:latest" "ghcr.io/nexoral/nexoraldns:latest")
  local img
  print_status "Pulling required Docker images before stopping DNS..."
  for img in "${images[@]}"; do
    # Friendly service-oriented messages instead of raw image names
    case "$img" in
      mongo:*)
        print_status "Configuring MongoDB..."
        if sudo docker pull "$img" > /dev/null 2>&1; then
          print_success "MongoDB configured."
        else
          print_warning "Failed to configure MongoDB (continue anyway)"
        fi
        ;;
      redis:*)
        print_status "Configuring Redis..."
        if sudo docker pull "$img" > /dev/null 2>&1; then
          print_success "Redis configured."
        else
          print_warning "Failed to configure Redis (continue anyway)"
        fi
        ;;
      *nexoraldns*|*nexoral* )
        print_status "Installing NexoralDNS..."
        if sudo docker pull "$img" > /dev/null 2>&1; then
          print_success "NexoralDNS image pulled."
        else
          print_warning "Failed to pull NexoralDNS image (continue anyway)"
        fi
        ;;
      *)
        print_status "Pulling $img..."
        if sudo docker pull "$img" > /dev/null 2>&1; then
          print_success "Pulled $img"
        else
          print_warning "Failed to pull $img (continue anyway)"
        fi
        ;;
    esac
  done
}

# Run docker compose but first pull required images (used for first-time/default install)
run_docker_compose_with_pull() {
  local command="$1"
  local message="$2"
  print_status "$message"
  pull_required_images
  # After pulling images, disable systemd-resolved if enabled so containers can bind to 53
  disable_systemd_resolved_if_enabled
  cd "$DOWNLOAD_DIR" && sudo docker compose $command > /dev/null 2>&1
}

# Run docker compose without pulling images first (used for start/stop flows)
run_docker_compose() {
  local command="$1"
  local message="$2"
  print_status "$message"
  # If bringing containers up, ensure systemd-resolved is disabled before starting
  if [[ "$command" == *"up -d"* ]]; then
    disable_systemd_resolved_if_enabled
  fi
  cd "$DOWNLOAD_DIR" && sudo docker compose $command > /dev/null 2>&1
}

# System compatibility checks
print_status "Checking system compatibility..."

# Check if running on Linux
if ! detect_linux; then
    print_error "This installer only supports Linux systems."
    print_status "Requirements:"
    echo "  • Linux operating system"
    echo "  • Debian-based distribution (Ubuntu, Zorin OS, Linux Mint, Debian)"
    echo "  • APT package manager"
    exit 1
fi

print_success "✓ Linux system detected"

# Check if Debian-based (has apt)
if ! detect_debian_based; then
    print_error "This installer requires a Debian-based Linux distribution with APT package manager."
    print_status "Supported distributions:"
    echo "  • Ubuntu (18.04 LTS or newer)"
    echo "  • Zorin OS (15 or newer)"
    echo "  • Linux Mint (19 or newer)"
    echo "  • Debian (10 or newer)"
    print_status "Your system appears to be missing the APT package manager."
    exit 1
fi

print_success "✓ Debian-based system detected"

# Check if supported distribution
if ! detect_supported_distro; then
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        print_error "Unsupported Linux distribution: $PRETTY_NAME"
    else
        print_error "Unable to detect Linux distribution."
    fi
    print_status "Supported distributions:"
    echo "  • Ubuntu (18.04 LTS or newer)"
    echo "  • Zorin OS (15 or newer)" 
    echo "  • Linux Mint (19 or newer)"
    echo "  • Debian (10 or newer)"
    print_warning "Other Debian-based distributions may work but are not officially supported."
    exit 1
fi

if [ -f /etc/os-release ]; then
    . /etc/os-release
    print_success "✓ Supported distribution detected: $PRETTY_NAME"
fi

# Check system resources
print_status "Checking system resources..."

# Check available RAM (minimum 4GB required)
TOTAL_RAM_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
TOTAL_RAM_GB=$((TOTAL_RAM_KB / 1024 / 1024))
MIN_RAM_GB=4

if [ "$TOTAL_RAM_GB" -lt "$MIN_RAM_GB" ]; then
    print_error "Insufficient RAM detected: ${TOTAL_RAM_GB}GB available"
    print_status "Minimum required: ${MIN_RAM_GB}GB RAM"
    print_warning "NexoralDNS requires at least ${MIN_RAM_GB}GB of available RAM to run properly."
    exit 1
fi

print_success "✓ RAM check passed: ${TOTAL_RAM_GB}GB available"

# Check available storage (minimum 10GB required)
AVAILABLE_STORAGE_KB=$(df "$HOME" | awk 'NR==2 {print $4}')
AVAILABLE_STORAGE_GB=$((AVAILABLE_STORAGE_KB / 1024 / 1024))
MIN_STORAGE_GB=10

if [ "$AVAILABLE_STORAGE_GB" -lt "$MIN_STORAGE_GB" ]; then
    print_error "Insufficient storage space: ${AVAILABLE_STORAGE_GB}GB available"
    print_status "Minimum required: ${MIN_STORAGE_GB}GB free storage"
    print_warning "NexoralDNS requires at least ${MIN_STORAGE_GB}GB of free storage space."
    exit 1
fi

print_success "✓ Storage check passed: ${AVAILABLE_STORAGE_GB}GB available"

echo ""

# Check for remove argument
if [[ "$1" == "remove" ]]; then
    clear
    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║${NC}                                                              ${RED}║${NC}"
    echo -e "${RED}║${NC}          ${BOLD}${WHITE}NexoralDNS Uninstaller${NC}                          ${RED}║${NC}"
    echo -e "${RED}║${NC}                                                              ${RED}║${NC}"
    echo -e "${RED}║${NC}        ${WHITE}This will completely remove NexoralDNS${NC}              ${RED}║${NC}"
    echo -e "${RED}║${NC}                                                              ${RED}║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    DOWNLOAD_DIR="$HOME/NexoralDNS"
    
    # Check if running in non-interactive mode (piped input)
    if [[ ! -t 0 ]]; then
        print_warning "Non-interactive mode detected. Proceeding with removal..."
        REPLY="y"
    else
        print_warning "This will remove all NexoralDNS configurations and data!"
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
    fi
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Uninstallation cancelled."
        exit 0
    fi
    
    print_status "Stopping NexoralDNS services..."
    if [ -d "$DOWNLOAD_DIR" ]; then
        cd "$DOWNLOAD_DIR" && sudo docker compose down > /dev/null 2>&1
        print_success "Services stopped successfully."
    else
        print_warning "NexoralDNS directory not found."
    fi
    
  # Ensure systemd-resolved is running after shutdown
  ensure_systemd_resolved_running
  # Reset local resolver to systemd stub resolver
  set_resolv_nameserver "127.0.0.53"
    
    print_status "Removing Docker images..."
    sudo docker rmi ghcr.io/nexoral/nexoraldns:latest 2>/dev/null || true
    sudo docker rmi mongo:latest 2>/dev/null || true
    sudo docker rmi redis:latest 2>/dev/null || true
    print_success "Docker images removed."
    
    print_status "Removing NexoralDNS directory..."
    if [ -d "$DOWNLOAD_DIR" ]; then
        rm -rf "$DOWNLOAD_DIR"
        print_success "Directory removed: $DOWNLOAD_DIR"
    else
        print_warning "Directory not found: $DOWNLOAD_DIR"
    fi
    
    print_status "Cleaning up Docker volumes..."
    sudo docker volume rm nexoraldns_mongodb_data 2>/dev/null || true
    print_success "Docker volumes cleaned."
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}                    ${BOLD}${GREEN}Uninstallation Complete!${NC}                  ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  ${WHITE}NexoralDNS has been completely removed from your system${NC}  ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  ${YELLOW}Don't forget to:${NC}                                      ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  ${WHITE}• Reset your router's DNS settings${NC}                     ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  ${WHITE}• Remove any static IP reservations${NC}                    ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    
    exit 0
fi

# Check for stop argument
if [[ "$1" == "stop" ]]; then
    clear
    echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║${NC}                                                              ${YELLOW}║${NC}"
    echo -e "${YELLOW}║${NC}          ${BOLD}${WHITE}Stopping NexoralDNS Services${NC}                   ${YELLOW}║${NC}"
    echo -e "${YELLOW}║${NC}                                                              ${YELLOW}║${NC}"
    echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    DOWNLOAD_DIR="$HOME/NexoralDNS"
    
    if [ -d "$DOWNLOAD_DIR" ] && [ -f "$DOWNLOAD_DIR/docker-compose.yml" ]; then
        print_status "Stopping NexoralDNS services..."
        cd "$DOWNLOAD_DIR" && sudo docker compose down > /dev/null 2>&1
        print_success "All NexoralDNS services have been stopped successfully!"
    # Ensure systemd-resolved is running after shutdown
    ensure_systemd_resolved_running
  # Reset local resolver to systemd stub resolver
  set_resolv_nameserver "127.0.0.53"
    else
        print_warning "NexoralDNS installation not found or docker-compose.yml missing."
        print_status "Please ensure NexoralDNS is installed in $DOWNLOAD_DIR"
    fi
    
    exit 0
fi

# Check for start argument
if [[ "$1" == "start" ]]; then
  # Ensure required ports are free; abort if any are occupied
  if ! check_ports_free; then
    print_error "One or more required ports are in use (4000, 4773). Please free them and try again."
    exit 1
  fi
  # Ensure systemd-resolved is running after shutdown
  ensure_systemd_resolved_running
    clear
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}          ${BOLD}${WHITE}Starting NexoralDNS Services${NC}                   ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    DOWNLOAD_DIR="$HOME/NexoralDNS"
    
    if [ -d "$DOWNLOAD_DIR" ] && [ -f "$DOWNLOAD_DIR/docker-compose.yml" ]; then
        
  print_status "Starting NexoralDNS services..."
  run_docker_compose "up -d" "Starting NexoralDNS services (this may take a few minutes)..."
  print_success "All NexoralDNS services have been started successfully!"
        
        # Get the DHCP IP address
        print_status "Detecting network configuration..."
        DHCP_IP=$(ip route get 8.8.8.8 | awk 'NR==1 {print $7}' 2>/dev/null)
        if [ -z "$DHCP_IP" ]; then
            DHCP_IP=$(hostname -I | awk '{print $1}' 2>/dev/null)
        fi

        # Update system resolver to point to this server so containers and host use NexoralDNS
        if [ -n "$DHCP_IP" ]; then
          set_resolv_nameserver "$DHCP_IP"
        else
          print_warning "Could not detect DHCP IP; /etc/resolv.conf left unchanged"
        fi
        
        echo ""
        echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║${NC}                    ${BOLD}${GREEN}Services Started!${NC}                       ${GREEN}║${NC}"
        echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
        if [ -n "$DHCP_IP" ]; then
            echo -e "${GREEN}║${NC}  ${WHITE}Server IP:${NC} ${BOLD}${GREEN}${DHCP_IP}${NC}                              ${GREEN}║${NC}"
            echo -e "${GREEN}║${NC}  ${WHITE}Web Interface:${NC} ${BOLD}${GREEN}http://localhost:4000${NC}              ${GREEN}║${NC}"
        else
            echo -e "${GREEN}║${NC}  ${WHITE}Web Interface:${NC} ${BOLD}${GREEN}http://localhost:4000${NC}              ${GREEN}║${NC}"
        fi
        echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
        echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    else
        print_error "NexoralDNS installation not found or docker-compose.yml missing."
        print_status "Please run the installation first:"
        echo "curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | sudo bash -"
    fi
    
    exit 0
fi

# Check for update argument: compare remote vs local and update only if remote > local
if [[ "$1" == "update" ]]; then
  DOWNLOAD_DIR="$HOME/NexoralDNS"
  COMPOSE_FILE="$DOWNLOAD_DIR/docker-compose.yml"
  # Ensure systemd-resolved is running after shutdown
  ensure_systemd_resolved_running
  # Reset local resolver to systemd stub resolver
  set_resolv_nameserver "127.0.0.53"

  if [ ! -d "$DOWNLOAD_DIR" ] || [ ! -f "$COMPOSE_FILE" ]; then
    print_error "NexoralDNS not installed. Run the installer first (no args)."
    exit 1
  fi

  print_status "Checking remote version for update..."
  remote_version=$(curl -s https://raw.githubusercontent.com/nexoral/NexoralDNS/main/VERSION 2>/dev/null || echo "")
  if [ -z "$remote_version" ]; then
    print_error "Could not fetch remote version information. Aborting update."
    exit 1
  fi

  VERSION_FILE="$DOWNLOAD_DIR/VERSION"
  # Read local version (if present)
  local_version=""
  if [ -f "$VERSION_FILE" ]; then
    local_version=$(cat "$VERSION_FILE" 2>/dev/null || true)
  fi

  print_status "Remote version: ${remote_version}  |  Local version: ${local_version:-'(none)'}"

  # Compare versions: remote vs local
  version_compare "$remote_version" "$local_version"
  result=$?
  if [ $result -eq 1 ]; then
    print_status "Remote version ($remote_version) is newer than local ($local_version). Updating..."
    # If compose file exists and services are running, bring them down first to safely replace images
    if [ -f "$COMPOSE_FILE" ]; then
      print_status "Stopping running NexoralDNS services before update..."
      cd "$DOWNLOAD_DIR" && sudo docker compose down > /dev/null 2>&1 || true
      print_success "Services stopped."
    fi
    print_status "Removing old NexoralDNS image..."
    sudo docker rmi ghcr.io/nexoral/nexoraldns:latest 2>/dev/null || true
    echo "$remote_version" > "$VERSION_FILE"
    run_docker_compose_with_pull "up -d" "Updating services (downloading new image, please wait)..."
    print_success "Update complete."

            # Get the DHCP IP address
        print_status "Detecting network configuration..."
        DHCP_IP=$(ip route get 8.8.8.8 | awk 'NR==1 {print $7}' 2>/dev/null)
        if [ -z "$DHCP_IP" ]; then
            DHCP_IP=$(hostname -I | awk '{print $1}' 2>/dev/null)
        fi

        # Update system resolver to point to this server so containers and host use NexoralDNS
        if [ -n "$DHCP_IP" ]; then
          set_resolv_nameserver "$DHCP_IP"
        else
          print_warning "Could not detect DHCP IP; /etc/resolv.conf left unchanged"
        fi
        
    exit 0
  else
    print_status "Local version ($local_version) is up-to-date or newer than remote ($remote_version). No update performed."
    exit 0
  fi
fi

# For any other case (default install or reinstall)
  # Ensure required ports are free; abort if any are occupied
  if ! check_ports_free; then
    print_error "One or more required ports are in use (4000, 4773). Please free them and try again."
    exit 1
  fi
  # Ensure systemd-resolved is running after shutdown
  ensure_systemd_resolved_running

# Fetch version for welcome banner
VERSION_URL="https://raw.githubusercontent.com/nexoral/NexoralDNS/main/VERSION"
REMOTE_VERSION=$(curl -s "$VERSION_URL" 2>/dev/null || echo "Unknown")

# Welcome Banner
clear
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}                                                              ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}          ${BOLD}${WHITE}Welcome to NexoralDNS Server Installation${NC}         ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}                                                              ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}                    ${PURPLE}Version: ${BOLD}${WHITE}${REMOTE_VERSION}${NC}                     ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}                                                              ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}        ${BLUE}This script will install and configure Docker${NC}         ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}        ${BLUE}and deploy the NexoralDNS server automatically${NC}        ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}                                                              ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

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

# Function to run docker compose with progress indication
run_docker_compose() {
    local command="$1"
    local message="$2"
    print_status "$message"
    # If bringing containers up, ensure systemd-resolved is disabled before starting
    if [[ "$command" == *"up -d"* ]]; then
      disable_systemd_resolved_if_enabled
    fi
    cd "$DOWNLOAD_DIR" && sudo docker compose $command > /dev/null 2>&1
}


# Create directory if it doesn't exist
DOWNLOAD_DIR="$HOME/NexoralDNS"
if [ ! -d "$DOWNLOAD_DIR" ]; then
  print_status "Creating directory ${BOLD}$DOWNLOAD_DIR${NC}..."
  mkdir -p "$DOWNLOAD_DIR"
else
  print_status "Using existing directory ${BOLD}$DOWNLOAD_DIR${NC}..."
fi

# Check if docker-compose.yml already exists
COMPOSE_FILE="$DOWNLOAD_DIR/docker-compose.yml"
if [ -f "$COMPOSE_FILE" ]; then
  print_warning "Existing docker-compose.yml found. Stopping current services..."
  cd "$DOWNLOAD_DIR" && sudo docker compose down > /dev/null 2>&1
  print_status "Removing existing docker-compose.yml..."
  sudo rm -rf "$COMPOSE_FILE"
fi

# Download the docker-compose.yml file
print_status "Downloading latest docker-compose.yml from GitHub..."
DOWNLOAD_URL="https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/docker-compose.yml"
if curl -L "$DOWNLOAD_URL" -o "$COMPOSE_FILE" > /dev/null 2>&1; then
  print_success "docker-compose.yml downloaded successfully"
else
  print_error "Failed to download docker-compose.yml"
  exit 1
fi

if [ -f "$COMPOSE_FILE" ]; then
  # Download and check VERSION file
  VERSION_FILE="$DOWNLOAD_DIR/VERSION"
  
  print_status "Checking version information..."
  remote_version=$(curl -s "$VERSION_URL")
  
  if [ -n "$remote_version" ]; then
    echo -e "    ${CYAN}Remote version:${NC} ${BOLD}$remote_version${NC}"
    
    # Check if local VERSION file exists
    if [ -f "$VERSION_FILE" ]; then
      local_version=$(cat "$VERSION_FILE")
      echo -e "    ${CYAN}Local version:${NC}  ${BOLD}$local_version${NC}"
      
      # using top-level version_compare() helper
      
      version_compare "$remote_version" "$local_version"
      comparison_result=$?
      
      if [ $comparison_result -eq 0 ]; then
        print_success "Versions are identical. Starting services..."
        run_docker_compose_with_pull "up -d" "Starting Docker containers (this may take a few minutes on first run)..."
      elif [ $comparison_result -eq 1 ] && [[ "$remote_version" == *"-stable" ]]; then
        print_warning "New stable version available! Updating..."
        print_status "Removing old Docker image..."
        sudo docker rmi ghcr.io/nexoral/nexoraldns:latest 2>/dev/null || true
        echo "$remote_version" > "$VERSION_FILE"
        run_docker_compose_with_pull "up -d" "Starting updated services (downloading new image, please wait)..."
      else
        print_status "Local version is current. Starting services..."
        run_docker_compose "up -d" "Starting Docker containers..."
      fi
    else
      print_status "First time installation. Creating version file..."
      echo "$remote_version" > "$VERSION_FILE"
  run_docker_compose_with_pull "up -d" "Starting services (downloading images, this may take several minutes)..."
    fi
  else
  print_warning "Could not fetch version information. Starting services with current setup..."
  run_docker_compose "up -d" "Starting Docker containers..."
  fi
  
  echo ""
  print_success "NexoralDNS services have been started successfully!"
  
  # Get the DHCP IP address
  print_status "Detecting network configuration..."
  DHCP_IP=$(ip route get 8.8.8.8 | awk 'NR==1 {print $7}' 2>/dev/null)
  if [ -z "$DHCP_IP" ]; then
    DHCP_IP=$(hostname -I | awk '{print $1}' 2>/dev/null)
  fi
  # Update resolv.conf so the machine uses the NexoralDNS server as its nameserver
  if [ -n "$DHCP_IP" ]; then
    set_resolv_nameserver "$DHCP_IP"
  else
    print_warning "Could not detect DHCP IP; /etc/resolv.conf left unchanged"
  fi
  
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║${NC}                    ${BOLD}${GREEN}Installation Complete!${NC}                    ${CYAN}║${NC}"
  echo -e "${CYAN}║${NC}                                                              ${CYAN}║${NC}"
  echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
  echo -e "${CYAN}║${NC}                    ${BOLD}${YELLOW}Important Configuration${NC}                 ${CYAN}║${NC}"
  echo -e "${CYAN}║${NC}                                                              ${CYAN}║${NC}"
  if [ -n "$DHCP_IP" ]; then
    echo -e "${CYAN}║${NC}  ${WHITE}Server IP:${NC} ${BOLD}${GREEN}${DHCP_IP}${NC}                              ${CYAN}║${NC}"
  else
    echo -e "${CYAN}║${NC}  ${WHITE}Server IP:${NC} ${BOLD}${RED}Unable to detect${NC}                       ${CYAN}║${NC}"
  fi
  echo -e "${CYAN}║${NC}                                                              ${CYAN}║${NC}"
  echo -e "${CYAN}║${NC}  ${YELLOW}To use NexoralDNS for all LAN devices:${NC}               ${CYAN}║${NC}"
  echo -e "${CYAN}║${NC}                                                              ${CYAN}║${NC}"
  echo -e "${CYAN}║${NC}  ${WHITE}1. Access your Router's Admin Panel${NC}                   ${CYAN}║${NC}"
  echo -e "${CYAN}║${NC}  ${WHITE}2. Navigate to DHCP/DNS Settings${NC}                      ${CYAN}║${NC}"
  if [ -n "$DHCP_IP" ]; then
    echo -e "${CYAN}║${NC}  ${WHITE}3. Set Primary DNS Server to:${NC} ${BOLD}${GREEN}${DHCP_IP}${NC}           ${CYAN}║${NC}"
  else
    echo -e "${CYAN}║${NC}  ${WHITE}3. Set Primary DNS Server to: ${BOLD}${RED}[Your Server IP]${NC}     ${CYAN}║${NC}"
  fi
  echo -e "${CYAN}║${NC}  ${WHITE}4. Save and restart your router${NC}                       ${CYAN}║${NC}"
  echo -e "${CYAN}║${NC}                                                              ${CYAN}║${NC}"
  echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
  echo -e "${CYAN}║${NC}                    ${BOLD}${BLUE}Web Interface Setup${NC}                     ${CYAN}║${NC}"
  echo -e "${CYAN}║${NC}                                                              ${CYAN}║${NC}"
  if [ -n "$DHCP_IP" ]; then
    echo -e "${CYAN}║${NC}  ${WHITE}1. Open browser and go to:${NC} ${BOLD}${GREEN}http://localhost:4000${NC}         ${CYAN}║${NC}"
  else
    echo -e "${CYAN}║${NC}  ${WHITE}1. Open browser and go to:${NC} ${BOLD}${GREEN}http://localhost:4000${NC}         ${CYAN}║${NC}"
  fi
  echo -e "${CYAN}║${NC}  ${WHITE}2. Login with Username:${NC} ${BOLD}admin${NC}                    ${CYAN}║${NC}"
  echo -e "${CYAN}║${NC}  ${WHITE}3. Login with Password:${NC} ${BOLD}admin${NC}                     ${CYAN}║${NC}"
  echo -e "${CYAN}║${NC}  ${WHITE}4. Change the default password immediately${NC}            ${CYAN}║${NC}"
  echo -e "${CYAN}║${NC}  ${WHITE}5. Activate NexoralDNS with your Cloud Key${NC}            ${CYAN}║${NC}"
  echo -e "${CYAN}║${NC}                                                              ${CYAN}║${NC}"
  echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
  echo -e "${CYAN}║${NC}  ${RED}${BOLD}CRITICAL: Set Static IP for this machine!${NC}           ${CYAN}║${NC}"
  echo -e "${CYAN}║${NC}                                                              ${CYAN}║${NC}"
  echo -e "${CYAN}║${NC}  ${WHITE}To avoid DNS service interruption:${NC}                    ${CYAN}║${NC}"
  if [ -n "$DHCP_IP" ]; then
    echo -e "${CYAN}║${NC}  ${WHITE}• Reserve/Static IP:${NC} ${BOLD}${GREEN}${DHCP_IP}${NC} in router settings    ${CYAN}║${NC}"
  else
    echo -e "${CYAN}║${NC}  ${WHITE}• Reserve current IP in router DHCP settings${NC}          ${CYAN}║${NC}"
  fi
  echo -e "${CYAN}║${NC}  ${WHITE}• This prevents IP changes that break DNS${NC}             ${CYAN}║${NC}"
  echo -e "${CYAN}║${NC}                                                              ${CYAN}║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
else
  print_error "Failed to download docker-compose.yml"
  exit 1
fi