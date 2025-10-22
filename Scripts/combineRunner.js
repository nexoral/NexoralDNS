const createTCPBroker = require('../DHCP/lib/config/DHCP');
const DNSclusterHandler = require('../Web/lib/cluster/Cluster');

const mainServer = async () => {
  DNSclusterHandler.default()
  createTCPBroker.default()
}

// If this file is run directly, execute the handler function
if (process.argv[1] === __filename) {
  mainServer();
}