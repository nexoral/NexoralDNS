// Handle incoming DNS queries and respond accordingly
import DNS from "../services/DNS.Service";

export default async function handler() {
  // Initialize and start the DNS server
  new DNS().start().listen().listenError();
}