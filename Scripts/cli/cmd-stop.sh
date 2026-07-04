# Sourced by Scripts/install.sh — not meant to run standalone.
if [ -z "${NEXORALDNS_CLI_LOADED:-}" ]; then
  echo "This file must be sourced via the nexoraldns CLI, not run directly." >&2
  exit 1
fi

# `nexoraldns stop` — stop the running NexoralDNS Docker services.
cmd_stop() {
    clear
    set_terminal_title "Stopping NexoralDNS"
    echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║${NC}                                                              ${YELLOW}║${NC}"
    echo -e "${YELLOW}║${NC}          ${BOLD}${WHITE}Stopping NexoralDNS Services${NC}                   ${YELLOW}║${NC}"
    echo -e "${YELLOW}║${NC}                                                              ${YELLOW}║${NC}"
    echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    DOWNLOAD_DIR="$(resolve_download_dir)"

    if [ -d "$DOWNLOAD_DIR" ] && [ -f "$DOWNLOAD_DIR/docker-compose.yml" ]; then
        print_status "Stopping NexoralDNS services..."
        cd "$DOWNLOAD_DIR" && sudo docker compose down > /dev/null 2>&1
        print_success "All NexoralDNS services have been stopped successfully!"
    ensure_systemd_resolved_running
    # 127.0.0.53 is systemd-resolved's stub resolver address.
    set_resolv_nameserver "127.0.0.53"
    else
        print_warning "NexoralDNS installation not found or docker-compose.yml missing."
        print_status "Please ensure NexoralDNS is installed in $DOWNLOAD_DIR"
    fi

    exit 0
}
