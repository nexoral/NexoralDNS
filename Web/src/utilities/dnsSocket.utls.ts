import dgram from "node:dgram";

/** SO_REUSEPORT for dgram sockets was added in Node v23.1.0. */
function supportsReusePort(): boolean {
  const [major, minor] = process.versions.node.split('.').map(Number);
  return major > 23 || (major === 23 && minor >= 1);
}

/**
 * Creates the UDP listener socket for DNS on port 53. On Node ≥ 23.1, SO_REUSEPORT
 * lets each cluster worker bind its own socket so the kernel load-balances across
 * workers; on older runtimes it falls back to the cluster shared-handle model.
 */
export function createDnsListenerSocket(): dgram.Socket {
  const options: dgram.SocketOptions = { type: "udp4", reuseAddr: true };
  if (supportsReusePort()) {
    (options as dgram.SocketOptions & { reusePort?: boolean }).reusePort = true;
  }
  return dgram.createSocket(options);
}
