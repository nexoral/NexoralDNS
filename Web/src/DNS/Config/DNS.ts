// Handle incoming DNS queries and respond accordingly
import DNS from "../services/DNS.Service";

export default async function startDNSServer() {
  // Start the DNS server and listen for incoming queries
  new DNS().start().listen().listenError();
}