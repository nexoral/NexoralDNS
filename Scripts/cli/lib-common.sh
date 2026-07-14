# Sourced by Scripts/install.sh — not meant to run standalone.
if [ -z "${NEXORALDNS_CLI_LOADED:-}" ]; then
  echo "This file must be sourced via the nexoraldns CLI, not run directly." >&2
  exit 1
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color
BOLD='\033[1m'

set_terminal_title() {
  # /dev/tty, not stdout: output may be redirected/piped, which would keep
  # the escape codes from ever reaching the actual terminal.
  if [ -c /dev/tty ]; then
    printf "\033]0;%s\007\033]1;%s\007\033]2;%s\007" "$1" "$1" "$1" >/dev/tty 2>/dev/null
  else
    printf "\033]0;%s\007\033]1;%s\007\033]2;%s\007" "$1" "$1" "$1" 2>/dev/null
  fi
}

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
  # enable (survive reboot) and restart (start it now) are separate steps —
  # enabling alone does not start the service.
  if sudo systemctl enable systemd-resolved >/dev/null 2>&1; then
    print_status "systemd-resolved enabled for automatic startup at boot."
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

disable_systemd_resolved_if_enabled() {
  if ! command -v systemctl >/dev/null 2>&1; then
    print_warning "systemctl not found; cannot manage systemd-resolved."
    return 2
  fi

  local acted=0
  # Stop (if running) so port 53 is freed for NexoralDNS to bind to.
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

  # Disable too, otherwise it restarts and reclaims port 53 on next boot.
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

# Replaces existing nameserver lines in /etc/resolv.conf, preserves the rest.
set_resolv_nameserver() {
  local ns_ip="$1"
  if [ -z "$ns_ip" ]; then
    print_warning "No nameserver IP provided to set_resolv_nameserver"
    return 1
  fi

  print_status "Updating /etc/resolv.conf nameserver -> $ns_ip"

  local rest
  rest=$(sudo grep -vE '^[[:space:]]*nameserver' /etc/resolv.conf 2>/dev/null || true)

  # systemd-resolved typically manages this path as a symlink; replace it
  # with a regular file so our write isn't clobbered by that management.
  if [ -L /etc/resolv.conf ]; then
    print_warning "/etc/resolv.conf is a symlink; replacing it with a regular file"
    sudo rm -f /etc/resolv.conf
  fi

  sudo bash -c "printf 'nameserver %s\n' '$ns_ip' > /etc/resolv.conf"

  if [ -n "$rest" ]; then
    printf '%s\n' "$rest" | sudo tee -a /etc/resolv.conf > /dev/null
  fi

  print_success "/etc/resolv.conf updated to use nameserver $ns_ip"
  return 0
}

# Returns 0 when all required ports (4000, 4773) are free, 1 if any is in use.
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

# Compares semver-ish strings a vs b. Returns: 1 if a>b, 2 if a<b, 0 if equal.
version_compare() {
  local a="$1" b="$2"
  local IFS=.
  local raw1 raw2 i
  local -a ver1 ver2

  # Strip -beta/-stable suffixes before comparing numeric components.
  raw1="${a%%-*}"
  raw2="${b%%-*}"

  read -ra ver1 <<<"$raw1"
  read -ra ver2 <<<"$raw2"

  for ((i=${#ver1[@]}; i<${#ver2[@]}; i++)); do ver1[i]=0; done
  for ((i=${#ver2[@]}; i<${#ver1[@]}; i++)); do ver2[i]=0; done

  for ((i=0; i<${#ver1[@]}; i++)); do
    if ((10#${ver1[i]} > 10#${ver2[i]})); then return 1; fi
    if ((10#${ver1[i]} < 10#${ver2[i]})); then return 2; fi
  done
  return 0
}

# Resolve the invoking user's real home directory regardless of how the CLI
# was invoked. `sudo` resets $HOME to root's home by default, so
# `sudo nexoraldns start` and a plain `nexoraldns start` would otherwise
# disagree on every $HOME-relative path (the install one-liner runs entirely
# under sudo too). When running as root via sudo, resolve the invoking
# user's real home instead of root's.
resolve_real_home() {
  local real_home="$HOME"
  if [ -n "${SUDO_USER:-}" ] && [ "${SUDO_USER}" != "root" ]; then
    local sudo_home
    sudo_home=$(getent passwd "$SUDO_USER" 2>/dev/null | cut -d: -f6)
    [ -n "$sudo_home" ] && real_home="$sudo_home"
  fi
  printf '%s\n' "$real_home"
}

NEXORALDNS_SYSTEM_DIR="/etc/nexoraldns"

# docker-compose.yml + VERSION are system config, not per-user data, and the
# whole CLI now requires root — a fixed system path means the directory's
# owner can never drift out from under a later invocation (the bug that
# caused a previous run's silent download failure).
resolve_download_dir() {
  local old_dir
  old_dir="$(resolve_real_home)/NexoralDNS"

  # One-time migration for installs from before the storage location moved.
  if [ ! -d "$NEXORALDNS_SYSTEM_DIR" ] && [ -d "$old_dir" ]; then
    mv "$old_dir" "$NEXORALDNS_SYSTEM_DIR"
  fi

  printf '%s\n' "$NEXORALDNS_SYSTEM_DIR"
}
