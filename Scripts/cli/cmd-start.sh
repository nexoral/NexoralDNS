# Sourced by Scripts/install.sh — not meant to run standalone.
if [ -z "${NEXORALDNS_CLI_LOADED:-}" ]; then
  echo "This file must be sourced via the nexoraldns CLI, not run directly." >&2
  exit 1
fi

# `nexoraldns start` — start the NexoralDNS Docker services.
cmd_start() {
  # Ensure required ports are free; abort if any are occupied
  if ! check_ports_free; then
    print_error "One or more required ports are in use (4000, 4773). Please free them and try again."
    exit 1
  fi
  # Ensure systemd-resolved is running after shutdown
  ensure_systemd_resolved_running
    clear
    set_terminal_title "Starting NexoralDNS"
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
}
