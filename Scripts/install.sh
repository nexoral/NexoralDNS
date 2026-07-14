#!/bin/bash

# ============================================================================
# NexoralDNS CLI orchestrator.
#
# This file only does two things:
#   1. Registers `nexoraldns` as a CLI command on first run.
#   2. Loads the task modules under cli/ (installed at /usr/share/nexoraldns/cli
#      by the .deb package, or fetched once on a fresh `curl | bash` run) and
#      dispatches to the requested subcommand.
#
# All actual task logic (docker engine install/purge, remove, start, stop,
# update, pack, deploy) lives in Scripts/cli/*.sh — see that directory.
# ============================================================================

# Every subcommand touches root-only resources (Docker, UFW, systemd,
# /etc/resolv.conf, /etc/nexoraldns) via a mix of bare and sudo-prefixed
# commands. Requiring root for the whole process up front — instead of
# per-command sudo — means every write happens under one consistent identity,
# so a directory/file created by one run can never be left in a state a later
# unprivileged run can't touch.
if [ "$(id -u)" -ne 0 ]; then
  echo "[ERROR] NexoralDNS must be run as root. Please re-run with sudo:" >&2
  echo "  sudo $0 $*" >&2
  exit 1
fi

# Installed location for CLI modules shipped by the .deb package.
NEXORALDNS_CLI_DIR="/usr/share/nexoraldns/cli"

# Every module this CLI needs, in load order (libs before commands).
CLI_MODULES=(
  lib-common.sh
  lib-system-check.sh
  lib-docker-engine.sh
  lib-docker-compose-ops.sh
  cmd-deploy.sh
  cmd-pack.sh
  cmd-remove.sh
  cmd-stop.sh
  cmd-start.sh
  cmd-update.sh
)

# Locate a directory that already contains every module we need — either a
# sibling cli/ next to this script (dev checkout) or the installed package
# location. Prints the directory and returns 0, or returns 1 if incomplete.
resolve_cli_dir() {
  local candidate script_dir module all_present

  if [ -n "${BASH_SOURCE:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    candidate="$script_dir/cli"
    if [ -d "$candidate" ]; then
      all_present=1
      for module in "${CLI_MODULES[@]}"; do
        [ -f "$candidate/$module" ] || { all_present=0; break; }
      done
      if [ "$all_present" -eq 1 ]; then
        printf '%s\n' "$candidate"
        return 0
      fi
    fi
  fi

  if [ -d "$NEXORALDNS_CLI_DIR" ]; then
    all_present=1
    for module in "${CLI_MODULES[@]}"; do
      [ -f "$NEXORALDNS_CLI_DIR/$module" ] || { all_present=0; break; }
    done
    if [ "$all_present" -eq 1 ]; then
      printf '%s\n' "$NEXORALDNS_CLI_DIR"
      return 0
    fi
  fi

  return 1
}

# Downloads every module into a fresh temp directory. Used only on a brand
# new machine (curl | bash) before nexoraldns has ever been installed.
fetch_cli_modules() {
  local tmp module
  tmp="$(mktemp -d)"
  for module in "${CLI_MODULES[@]}"; do
    if ! curl -fsSL "https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/cli/$module" -o "$tmp/$module"; then
      echo "[ERROR] Failed to download CLI module: $module" >&2
      exit 1
    fi
  done
  printf '%s\n' "$tmp"
}

CLI_DIR="$(resolve_cli_dir)" || CLI_DIR="$(fetch_cli_modules)"

NEXORALDNS_CLI_LOADED=1
for module in "${CLI_MODULES[@]}"; do
  # shellcheck source=/dev/null
  source "$CLI_DIR/$module"
done

case "${1:-}" in
  remove) set_terminal_title "NexoralDNS Uninstaller" ;;
  stop)   set_terminal_title "Stopping NexoralDNS" ;;
  start)  set_terminal_title "Starting NexoralDNS" ;;
  update) set_terminal_title "NexoralDNS Updater" ;;
  *)      set_terminal_title "NexoralDNS Installer" ;;
esac

# Dispatch to the requested subcommand. Each cmd_* function exits the process
# itself, so execution only falls through to the default install/reinstall
# flow below when no subcommand matched.
case "${1:-}" in
  pack)   cmd_pack "$@" ;;
  remove) cmd_remove "$@" ;;
  stop)   cmd_stop "$@" ;;
  start)  cmd_start "$@" ;;
  update) cmd_update "$@" ;;
esac

# Anything else falls through to the default install/reinstall flow.
if [ "$0" != "nexoraldns" ] && [ "$0" != "/usr/bin/nexoraldns" ] && ! dpkg -s nexoraldns >/dev/null 2>&1; then
    print_status "Registering nexoraldns CLI command..."
    ARCH=$(dpkg --print-architecture 2>/dev/null)
    echo "Detected architecture: $ARCH"

    DEB_INSTALLED=false
    if [[ "$ARCH" == "amd64" || "$ARCH" == "arm64" || "$ARCH" == "i386" ]]; then
        REPO="nexoral/NexoralDNS"
        RELEASE_INFO=$(curl -s "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null)
        if [ -n "$RELEASE_INFO" ]; then
            REMOTE_VER=$(echo "$RELEASE_INFO" | grep -o '"tag_name": "[^"]*' | cut -d'"' -f4)
            if [ -n "$REMOTE_VER" ]; then
                PKG="nexoraldns_${REMOTE_VER}_${ARCH}.deb"
                URL="https://github.com/${REPO}/releases/download/${REMOTE_VER}/${PKG}"
                print_status "Downloading package: $PKG from $URL"
                TEMP_DEB="/tmp/$PKG"
                if curl -fsSL "$URL" -o "$TEMP_DEB"; then
                    if sudo dpkg -i "$TEMP_DEB" >/dev/null 2>&1; then
                        DEB_INSTALLED=true
                        print_success "CLI package (nexoraldns) installed successfully."
                    fi
                fi
                rm -f "$TEMP_DEB"
            fi
        fi
    fi

    if [ "$DEB_INSTALLED" = "false" ]; then
        if [ -f "$0" ] && [[ "$0" == *"install.sh" ]]; then
            sudo cp "$0" /usr/bin/nexoraldns && sudo chmod +x /usr/bin/nexoraldns
            print_success "CLI shortcut registered as 'nexoraldns'."
        else
            sudo curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh -o /usr/bin/nexoraldns && sudo chmod +x /usr/bin/nexoraldns
            print_success "CLI shortcut registered as 'nexoraldns' from GitHub."
        fi
    fi
fi

cmd_deploy "$@"
