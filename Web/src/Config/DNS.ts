// Handle incoming DNS queries and respond accordingly
import DNS from "../services/DNS.Service";
import databaseConfig from "../Database/Axiodb.config";

// Initialize and start the DNS server
new DNS(databaseConfig).start().listen().listenError();
