const DNSclusterHandler = require('../Web/lib/cluster/Cluster');
const cluster = require('cluster');

const mainServer = async () => {
  // Start DNS cluster handler (this will fork workers)
  DNSclusterHandler.default()
  
}

// If this file is run directly, execute the handler function
if (process.argv[1] === __filename) {
  mainServer();
}