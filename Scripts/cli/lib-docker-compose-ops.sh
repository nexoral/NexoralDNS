# Sourced by Scripts/install.sh — not meant to run standalone.
if [ -z "${NEXORALDNS_CLI_LOADED:-}" ]; then
  echo "This file must be sourced via the nexoraldns CLI, not run directly." >&2
  exit 1
fi

# Renders our own progress bar in the terminal, derived from docker's
# per-layer status stream (docker's raw layer output is never shown).
# Each layer counts as 2 units of work: download complete + extract complete.
pull_image_with_progress() {
  local img="$1"
  local label="$2"

  # No TTY (output piped/redirected): a redrawing bar would produce garbage.
  if [ ! -t 1 ]; then
    sudo docker pull "$img" > /dev/null 2>&1
    return $?
  fi

  sudo docker pull "$img" 2>&1 | {
    local total=0 done_units=0 pct=0 last_pct=-1
    local bar_width=30 filled bar line
    printf "${GREEN}[INFO]${NC} %s [%-${bar_width}s]   0%%" "$label" ""
    while IFS= read -r line; do
      case "$line" in
        *": Pulling fs layer")          total=$((total + 2)) ;;
        *": Already exists")            total=$((total + 2)); done_units=$((done_units + 2)) ;;
        *": Download complete")         done_units=$((done_units + 1)) ;;
        *": Pull complete")             done_units=$((done_units + 1)) ;;
        "Status: Image is up to date"*) total=2; done_units=2 ;;
      esac
      [ "$total" -eq 0 ] && continue
      pct=$(( done_units * 100 / total ))
      [ "$pct" -gt 100 ] && pct=100
      [ "$pct" -eq "$last_pct" ] && continue
      last_pct=$pct
      filled=$(( pct * bar_width / 100 ))
      bar=$(printf '%*s' "$filled" '' | tr ' ' '#')
      printf "\r${GREEN}[INFO]${NC} %s [%-${bar_width}s] %3d%%" "$label" "$bar" "$pct"
    done
    # Clear the bar line so the caller's success/warning message replaces it
    printf '\r\033[2K'
  }
  return "${PIPESTATUS[0]}"
}

# Pulls before system services are stopped, so DNS keeps working during the pull.
pull_required_images() {
  local entries=(
    "mongo:latest|MongoDB|Configuring"
    "redis:latest|Redis|Configuring"
    "rabbitmq:management|RabbitMQ|Configuring"
    "ghcr.io/nexoral/nexoraldns:latest|NexoralDNS|Installing"
  )
  local entry img label verb
  print_status "Pulling required Docker images before stopping DNS..."
  for entry in "${entries[@]}"; do
    IFS='|' read -r img label verb <<< "$entry"
    if pull_image_with_progress "$img" "${verb} ${label}"; then
      if [ "$verb" = "Installing" ]; then
        print_success "${label} installed."
      else
        print_success "${label} configured."
      fi
    else
      print_warning "Failed to configure ${label} (continue anyway)"
    fi
  done
}

run_docker_compose_with_pull() {
  local command="$1"
  local message="$2"
  print_status "$message"
  pull_required_images
  # So containers can bind to port 53.
  disable_systemd_resolved_if_enabled
  cd "$DOWNLOAD_DIR" && sudo docker compose $command > /dev/null 2>&1
}

run_docker_compose() {
  local command="$1"
  local message="$2"
  print_status "$message"
  if [[ "$command" == *"up -d"* ]]; then
    disable_systemd_resolved_if_enabled
  fi
  cd "$DOWNLOAD_DIR" && sudo docker compose $command > /dev/null 2>&1
}
