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

# Pulls before system services are stopped, so DNS keeps working during the
# pull. Image list comes from docker-compose.yml itself (docker compose
# config --images), never hardcoded — a hardcoded list previously drifted
# from the compose file's actual redis:alpine tag (this had pinned
# redis:latest), leaving the real image unpulled. Returns nonzero if any
# image failed, so the caller knows it is NOT safe to disable the host's
# DNS resolver yet.
pull_required_images() {
  print_status "Pulling required Docker images before stopping DNS..."

  local images image label failed=0
  images=$(cd "$DOWNLOAD_DIR" && docker compose config --images 2>/dev/null)
  if [ -z "$images" ]; then
    print_error "Could not read the image list from docker-compose.yml."
    return 1
  fi

  while IFS= read -r image; do
    [ -z "$image" ] && continue
    label="$(basename "${image%%:*}")"
    label="$(tr '[:lower:]' '[:upper:]' <<< "${label:0:1}")${label:1}"
    if pull_image_with_progress "$image" "Pulling ${label}"; then
      print_success "${label} image ready."
    else
      print_error "Failed to pull ${label} image (${image})."
      failed=1
    fi
  done <<< "$images"

  return "$failed"
}

# Runs `docker compose $command`, quiet on success. On failure, prints the
# captured output and returns nonzero — callers must check this and NOT
# report success or touch /etc/resolv.conf when it fails.
_run_docker_compose_checked() {
  local command="$1"
  local output
  if ! cd "$DOWNLOAD_DIR"; then
    print_error "Cannot access $DOWNLOAD_DIR"
    return 1
  fi
  if output=$(docker compose $command 2>&1); then
    return 0
  fi
  print_error "docker compose $command failed:"
  echo "$output" >&2
  return 1
}

run_docker_compose_with_pull() {
  local command="$1"
  local message="$2"
  print_status "$message"
  if ! pull_required_images; then
    print_error "One or more required images failed to download — aborting before touching DNS."
    return 1
  fi
  # Only safe to disable the host's resolver once every image compose needs
  # is confirmed present locally, so `docker compose up` never has to pull
  # anything itself. Doing this before that guarantee is exactly what broke
  # DNS mid-deploy: systemd-resolved got disabled first, then `up -d` still
  # needed an unpulled image and had no resolver left to reach the registry.
  disable_systemd_resolved_if_enabled
  _run_docker_compose_checked "$command"
}

run_docker_compose() {
  local command="$1"
  local message="$2"
  print_status "$message"
  if [[ "$command" == *"up -d"* ]]; then
    disable_systemd_resolved_if_enabled
  fi
  _run_docker_compose_checked "$command"
}
