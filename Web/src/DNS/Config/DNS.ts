// Handle incoming DNS queries and respond accordingly
import DNS from "../services/DNS.Service";
import databaseConfig from "../../Database/Axiodb.config";

export default async function startDNSServer() {
  // Start the DNS server and listen for incoming queries
  new DNS(databaseConfig).start().listen().listenError();
}