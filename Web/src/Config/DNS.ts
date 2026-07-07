// Handle incoming DNS queries and respond accordingly
import container from "../container/appContainer";
import DNS from "../services/DNS/DNS.Service";
import DNS_TCP from "../services/DNS/DNS_TCP.Service";
import DNS_DoT from "../services/DNS/DNS_DoT.Service";

export default async function handler() {
  // UDP DNS — port 53 UDP (RFC 1035, existing)
  container.get<DNS>('DNS').start().listen().listenError();

  // TCP DNS — port 53 TCP (RFC 1035 §4.2.2 / RFC 7766)
  container.get<DNS_TCP>('DNS_TCP').start().listen().listenError();

  // DNS over TLS — port 853 (RFC 7858)
  // Zero-config: auto-generates a self-signed cert if none found at DOT_CERT_DIR
  container.get<DNS_DoT>('DNS_DoT').start().listen().listenError();
}

// If this file is run directly, execute the handler function
if (process.argv[1] === __filename) {
  handler();
}
