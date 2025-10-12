// Handle incoming DNS queries and respond accordingly
import createTCPBroker from "../Broker/TCP.broker";
import DNS from "../services/DNS.Service";

export default async function handler() {
  // Initialize and start the DNS server
  new DNS().start().listen().listenError();

  createTCPBroker();
}

// If this file is run directly, execute the handler function
if (process.argv[1] === __filename) {
  handler();
}