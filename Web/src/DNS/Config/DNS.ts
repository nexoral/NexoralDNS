// Handle incoming DNS queries and respond accordingly
import NewNexoralDB from "../../Database/Axiodb.config";
import DNS from "../services/DNS.Service";

export default async function startDNSServer() {
  NewNexoralDB.createDB("NewDB");
  // Start the DNS server and listen for incoming queries
  new DNS().start().listen().listenError();
}