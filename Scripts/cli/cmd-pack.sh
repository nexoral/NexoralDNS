# Sourced by Scripts/install.sh — not meant to run standalone.
if [ -z "${NEXORALDNS_CLI_LOADED:-}" ]; then
  echo "This file must be sourced via the nexoraldns CLI, not run directly." >&2
  exit 1
fi

# `nexoraldns pack` — self-update the CLI .deb package to the latest release.
cmd_pack() {
    ARCH=$(dpkg --print-architecture 2>/dev/null)
    echo "Detected architecture: $ARCH"

    if [[ "$ARCH" != "amd64" && "$ARCH" != "arm64" && "$ARCH" != "i386" ]]; then
        print_error "Unsupported architecture: $ARCH"
        exit 1
    fi

    print_status "Checking for latest nexoraldns package version..."
    REPO="nexoral/NexoralDNS"
    RELEASE_INFO=$(curl -s "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null)

    if [ -z "$RELEASE_INFO" ]; then
        print_error "Could not fetch release information from GitHub."
        exit 1
    fi

    REMOTE_VER=$(echo "$RELEASE_INFO" | grep -o '"tag_name": "[^"]*' | cut -d'"' -f4)
    if [ -z "$REMOTE_VER" ]; then
        print_error "Could not parse latest version tag."
        exit 1
    fi

    LOCAL_VER=$(dpkg -s nexoraldns 2>/dev/null | grep -i "^Version:" | awk '{print $2}')
    if [ -z "$LOCAL_VER" ]; then
        LOCAL_VER="0.0.0"
    fi

    print_status "Local CLI Version: ${LOCAL_VER} | Remote CLI Version: ${REMOTE_VER}"

    version_compare "$REMOTE_VER" "$LOCAL_VER"
    comp=$?
    if [ $comp -ne 1 ]; then
        print_success "NexoralDNS CLI package is already up to date!"
        exit 0
    fi

    PKG="nexoraldns_${REMOTE_VER}_${ARCH}.deb"
    URL="https://github.com/${REPO}/releases/download/${REMOTE_VER}/${PKG}"
    print_status "Downloading package: $PKG from $URL"

    TEMP_DEB="/tmp/$PKG"
    if curl -fsSL "$URL" -o "$TEMP_DEB"; then
        print_status "Installing latest package..."
        sudo dpkg -i "$TEMP_DEB"
        rm -f "$TEMP_DEB"
        print_success "NexoralDNS CLI package successfully updated to ${REMOTE_VER}!"
    else
        print_error "Failed to download package from $URL"
        exit 1
    fi
    exit 0
}
