/* eslint-disable @typescript-eslint/no-unused-vars */
// Handle incoming DNS queries and respond accordingly
import DNS from "../services/DNS.Service";
import NewNexoralDB from "../../Database/Axiodb.config";
// Types
import Database from "axiodb/lib/Services/Database/database.operation";
import Collection from "axiodb/lib/Services/Collection/collection.operation";

// DB Configurations
let DNS_DB: Database;
let DNS_Record_Collection: Collection;

export default async function startDNSServer() {
  DNS_DB = await NewNexoralDB.createDB("DNS");
  DNS_Record_Collection = await DNS_DB.createCollection("Records");
  // Start the DNS server and listen for incoming queries
  new DNS().start().listen().listenError();
}