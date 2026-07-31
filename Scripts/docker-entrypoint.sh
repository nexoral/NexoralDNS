#!/bin/sh
set -e

# Raise the kernel's UDP socket buffer ceiling so the DNS UDP listeners and the
# upstream forwarder (Web/internal/netutil/socket.go, Web/internal/forwarder/)
# actually get the 4MB buffers they ask for via SetReadBuffer/SetWriteBuffer.
# Without this, net.core.rmem_max/wmem_max silently caps those requests back
# down to the host's default (~208KB on stock Linux) no matter what is asked for.
#
# Web/ opens one UDP socket per ~75% of CPUs (all sharing port 53 via
# SO_REUSEPORT), so the ceiling matters more here than with a single socket.
# The granted size is logged at startup — check it there if queries are dropped.
#
# This only works because the nexoraldns service runs with network_mode: host
# + privileged: true (docker-compose.yml / dev.compose.yaml) — with host
# networking there's no separate netns, so writing /proc/sys/net/core/* here
# writes the real host value. Compose's `sysctls:` key can't be used instead:
# Docker rejects namespaced sysctl overrides for containers on host networking.
if [ -w /proc/sys/net/core/rmem_max ]; then
  echo 4194304 > /proc/sys/net/core/rmem_max
  echo 4194304 > /proc/sys/net/core/wmem_max
  echo "[entrypoint] Raised net.core.rmem_max/wmem_max to 4MB"
else
  echo "[entrypoint] WARNING: cannot write /proc/sys/net/core/rmem_max — UDP socket buffers will stay at the host default. Requires --privileged + network_mode: host."
fi

# Start the core DNS server (Web/, a Go binary). It is not managed by pm2:
# pm2 supervises Node processes, and a compiled binary needs nothing more than a
# restart loop.
#
# Runs as root because it binds ports 53 and 853 and writes the DoT certificate
# to /etc/nexoral/cert on first start.
#
# set +e inside the subshell so a non-zero exit restarts the server instead of
# tripping the script-level `set -e` and taking the container down with it.
(
  set +e
  while true; do
    /app/Web/web >> /var/log/web.log 2>&1
    echo "[entrypoint] DNS server exited (code $?) — restarting in 5s" >> /var/log/web.log
    sleep 5
  done
) &

# pm2 stays in the foreground as PID 1, so the container's lifetime follows it.
exec sudo pm2-runtime start ecosystem.config.js
