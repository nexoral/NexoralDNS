# Sourced by Scripts/install.sh — not meant to run standalone.
if [ -z "${NEXORALDNS_CLI_LOADED:-}" ]; then
  echo "This file must be sourced via the nexoraldns CLI, not run directly." >&2
  exit 1
fi

# `nexoraldns remove` — fully uninstall NexoralDNS, its Docker resources,
# firewall rules, the CLI package itself, and Docker/Docker Compose.
cmd_remove() {
    clear
    set_terminal_title "NexoralDNS Uninstaller"
    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║${NC}                                                              ${RED}║${NC}"
    echo -e "${RED}║${NC}          ${BOLD}${WHITE}NexoralDNS Uninstaller${NC}                          ${RED}║${NC}"
    echo -e "${RED}║${NC}                                                              ${RED}║${NC}"
    echo -e "${RED}║${NC}        ${WHITE}This will completely remove NexoralDNS${NC}              ${RED}║${NC}"
    echo -e "${RED}║${NC}                                                              ${RED}║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    DOWNLOAD_DIR="$(resolve_download_dir)"

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

  ensure_systemd_resolved_running
  # 127.0.0.53 is systemd-resolved's stub resolver address.
  set_resolv_nameserver "127.0.0.53"

    print_status "Removing Docker images..."
    sudo docker rmi ghcr.io/nexoral/nexoraldns:latest 2>/dev/null || true
    sudo docker rmi mongo:latest 2>/dev/null || true
    sudo docker rmi redis:latest 2>/dev/null || true
    sudo docker rmi rabbitmq:management 2>/dev/null || true
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
    sudo docker volume rm nexoraldns_redis_data 2>/dev/null || true
    sudo docker volume rm nexoraldns_rabbitmq_data 2>/dev/null || true
    print_success "Docker volumes cleaned."

    if command -v ufw &> /dev/null; then
      if sudo ufw status | grep -q "Status: active"; then
        print_status "Removing firewall rules..."
        for port in 53 4000 4773; do
          if sudo ufw delete allow $port > /dev/null 2>&1; then
            print_success "Port $port rule removed from UFW"
          fi
        done
        if sudo ufw reload > /dev/null 2>&1; then
          print_success "UFW firewall rules updated"
        fi
    fi
    fi

    print_status "Removing CLI package..."
    if dpkg -s nexoraldns >/dev/null 2>&1; then
        sudo dpkg -P nexoraldns >/dev/null 2>&1 || true
    fi
    sudo rm -f /usr/bin/nexoraldns 2>/dev/null || true
    sudo rm -rf /usr/share/nexoraldns 2>/dev/null || true
    print_success "CLI package removed."

    # Ask user before removing Docker and Docker Compose
    echo ""
    print_warning "Docker and Docker Compose are still installed on your system."

    if [[ ! -t 0 ]]; then
        print_status "Non-interactive mode detected. Skipping Docker removal prompt..."
        REMOVE_DOCKER="n"
    else
        read -p "Would you like to remove Docker and Docker Compose? (y/N): " -n 1 -r
        echo
        REMOVE_DOCKER="${REPLY}"
    fi

    if [[ $REMOVE_DOCKER =~ ^[Yy]$ ]]; then
        purge_docker_completely
        DOCKER_REMOVED="${WHITE}Docker and Docker Compose have been removed${NC}"
    else
        print_status "Docker and Docker Compose were not removed. You can remove them manually later if needed."
        DOCKER_REMOVED="${WHITE}Docker and Docker Compose are still installed on your system${NC}"
    fi

    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}                    ${BOLD}${GREEN}Uninstallation Complete!${NC}                  ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  ${WHITE}NexoralDNS has been completely removed from your system${NC}  ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  $DOCKER_REMOVED                         ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  ${YELLOW}Don't forget to:${NC}                                      ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  ${WHITE}• Reset your router's DNS settings${NC}                     ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  ${WHITE}• Remove any static IP reservations${NC}                    ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"

    exit 0
}
