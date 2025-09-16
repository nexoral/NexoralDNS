/* eslint-disable @typescript-eslint/no-unused-vars */
// Handle incoming DNS queries and respond accordingly
import DNS from "../services/DNS.Service";
import NewNexoralDB from "../../Database/Axiodb.config";
// Types
import Database from "axiodb/lib/Services/Database/database.operation";

// DB Configurations
let DNS_Record_DB: Database;

export default async function startDNSServer() {
  DNS_Record_DB = await NewNexoralDB.createDB("DNS");
  // Start the DNS server and listen for incoming queries
  new DNS().start().listen().listenError();
}