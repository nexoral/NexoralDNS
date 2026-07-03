# Sourced by Scripts/install.sh — not meant to run standalone.
if [ -z "${NEXORALDNS_CLI_LOADED:-}" ]; then
  echo "This file must be sourced via the nexoraldns CLI, not run directly." >&2
  exit 1
fi

# `nexoraldns` (no subcommand) — default install/reinstall flow: system
# checks, firewall, Docker Engine, docker-compose.yml, and bring the stack up.
cmd_deploy() {
# Run system compatibility checks
check_system_compatibility

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
set_terminal_title "NexoralDNS Installer"
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

print_status "Checking and configuring firewall..."

# Check if UFW is enabled and allow required ports
if command -v ufw &> /dev/null; then
  if sudo ufw status | grep -q "Status: active"; then
    print_status "UFW firewall is active. Configuring ports..."

    # Allow required ports
    for port in 53 4000 4773; do
      if sudo ufw allow $port > /dev/null 2>&1; then
        print_success "Port $port allowed in UFW"
      else
        print_warning "Failed to allow port $port in UFW"
      fi
    done

    # Reload UFW to apply changes
    if sudo ufw reload > /dev/null 2>&1; then
      print_success "UFW firewall rules updated"
    fi
  else
    print_status "UFW is installed but not active"
  fi
else
  print_status "UFW firewall not installed"
fi

echo ""

install_docker_engine

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
}
