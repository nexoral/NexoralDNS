#!/bin/sh
set -e

# Raise the kernel's UDP socket buffer ceiling so the DNS UDP listener and
# forwarder (Web/src/services/DNS/DNS.Service.ts, .../Forwarder/GlobalDNSforwarder.service.ts)
# can actually get the larger buffers they request via setRecvBufferSize/setSendBufferSize.
# Without this, net.core.rmem_max/wmem_max silently caps those requests back
# down to the host's default (~208KB on stock Linux) regardless of what the
# Node code asks for.
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

exec sudo pm2-runtime start ecosystem.config.js
