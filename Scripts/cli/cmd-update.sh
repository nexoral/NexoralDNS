# Sourced by Scripts/install.sh — not meant to run standalone.
if [ -z "${NEXORALDNS_CLI_LOADED:-}" ]; then
  echo "This file must be sourced via the nexoraldns CLI, not run directly." >&2
  exit 1
fi

# `nexoraldns update` — compare remote vs local app VERSION and update the
# running docker-compose stack only when a newer version is available.
cmd_update() {
  check_system_compatibility

  DOWNLOAD_DIR="$(resolve_download_dir)"
  COMPOSE_FILE="$DOWNLOAD_DIR/docker-compose.yml"
  ensure_systemd_resolved_running
  # 127.0.0.53 is systemd-resolved's stub resolver address.
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
  local_version=""
  if [ -f "$VERSION_FILE" ]; then
    local_version=$(cat "$VERSION_FILE" 2>/dev/null || true)
  fi

  print_status "Remote version: ${remote_version}  |  Local version: ${local_version:-'(none)'}"

  version_compare "$remote_version" "$local_version"
  result=$?
  if [ $result -eq 1 ]; then
    print_status "Remote version ($remote_version) is newer than local ($local_version). Updating..."
    # Bring down first so the old image can be safely replaced.
    if [ -f "$COMPOSE_FILE" ]; then
      print_status "Stopping running NexoralDNS services before update..."
      cd "$DOWNLOAD_DIR" && sudo docker compose down > /dev/null 2>&1 || true
      print_success "Services stopped."
    fi
    print_status "Removing old NexoralDNS image..."
    sudo docker rmi ghcr.io/nexoral/nexoraldns:latest 2>/dev/null || true
    echo "$remote_version" > "$VERSION_FILE"
    if ! run_docker_compose_with_pull "up -d" "Updating services (downloading new image, please wait)..."; then
      print_error "Failed to start the updated NexoralDNS services — see the docker compose output above."
      print_status "/etc/resolv.conf was left unchanged since the DNS service is not actually running."
      exit 1
    fi
    print_success "Update complete."

        print_status "Detecting network configuration..."
        DHCP_IP=$(ip route get 8.8.8.8 | awk 'NR==1 {print $7}' 2>/dev/null)
        if [ -z "$DHCP_IP" ]; then
            DHCP_IP=$(hostname -I | awk '{print $1}' 2>/dev/null)
        fi

        if [ -n "$DHCP_IP" ]; then
          set_resolv_nameserver "$DHCP_IP"
        else
          print_warning "Could not detect DHCP IP; /etc/resolv.conf left unchanged"
        fi

    exit 0
  else
    print_status "Local version ($local_version) is up-to-date or newer than remote ($remote_version). No update performed."

    print_status "Detecting network configuration..."
    DHCP_IP=$(ip route get 8.8.8.8 | awk 'NR==1 {print $7}' 2>/dev/null)
    if [ -z "$DHCP_IP" ]; then
        DHCP_IP=$(hostname -I | awk '{print $1}' 2>/dev/null)
    fi

    if [ -n "$DHCP_IP" ]; then
      set_resolv_nameserver "$DHCP_IP"
    else
      print_warning "Could not detect DHCP IP; /etc/resolv.conf left unchanged"
    fi

    disable_systemd_resolved_if_enabled

    exit 0
  fi
}
