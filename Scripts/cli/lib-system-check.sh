# Sourced by Scripts/install.sh — not meant to run standalone.
if [ -z "${NEXORALDNS_CLI_LOADED:-}" ]; then
  echo "This file must be sourced via the nexoraldns CLI, not run directly." >&2
  exit 1
fi

check_system_compatibility() {
  print_status "Checking system compatibility..."

  if ! detect_linux; then
    print_error "This installer only supports Linux systems."
    print_status "Requirements:"
    echo "  • Linux operating system"
    echo "  • Debian-based distribution (Ubuntu, Zorin OS, Linux Mint, Debian)"
    echo "  • APT package manager"
    exit 1
  fi

  print_success "✓ Linux system detected"

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

  print_status "Checking system resources..."

  TOTAL_RAM_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
  TOTAL_RAM_GB=$((TOTAL_RAM_KB / 1024 / 1024))
  MIN_RAM_GB=2

  if [ "$TOTAL_RAM_GB" -lt "$MIN_RAM_GB" ]; then
    print_error "Insufficient RAM detected: ${TOTAL_RAM_GB}GB available"
    print_status "Minimum required: ${MIN_RAM_GB}GB RAM"
    print_warning "NexoralDNS requires at least ${MIN_RAM_GB}GB of available RAM to run properly."
    exit 1
  fi

  print_success "✓ RAM check passed: ${TOTAL_RAM_GB}GB available"

  # resolve_real_home, not $HOME directly: checks space where NexoralDNS will
  # actually install, which can differ from $HOME under sudo.
  AVAILABLE_STORAGE_KB=$(df "$(resolve_real_home)" | awk 'NR==2 {print $4}')
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
}
