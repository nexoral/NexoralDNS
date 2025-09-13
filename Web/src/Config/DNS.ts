// Handle incoming DNS queries and respond accordingly
import DNS from "../services/DNS.Service";

// Start the DNS server
export default new DNS().start().listen().listenError();