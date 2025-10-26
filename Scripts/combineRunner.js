const createTCPBroker = require('../DHCP/lib/config/DHCP');
const DNSclusterHandler = require('../Web/lib/cluster/Cluster');
const cluster = require('cluster');

const mainServer = async () => {
  // Start DNS cluster handler (this will fork workers)
  DNSclusterHandler.default()
  
  // Only run TCP broker in the primary process (single instance)
  if (cluster.isPrimary) {
    createTCPBroker.default()
  }
}

// If this file is run directly, execute the handler function
if (process.argv[1] === __filename) {
  mainServer();
}