// cluster-dgram-reuse.ts
import cluster from "cluster";
import os from "os";
import handler from "../Config/DNS";
import { Console } from "outers";
const numCPUs = os.cpus().length;
const totalUsableCpus = Math.max(1, Math.floor(numCPUs * 0.75)); // Use at least 1 CPU, up to 75% of total CPUs
Console.green(`Starting DNS server in cluster mode with ${totalUsableCpus} workers...`);


// Configure cluster for better UDP load balancing
cluster.schedulingPolicy = cluster.SCHED_RR; // Round-robin

const startCluster = async () => {
  // Fork workers if primary
  if (cluster.isPrimary) {
    for (let i = 0; i < totalUsableCpus; i++) {
      cluster.fork();
    }
  } else {
    // Workers can share any UDP connection
    handler();
  }
}

// Run the server if this file is executed directly
if (process.argv[1] === __filename) {
  startCluster();
}

export default startCluster;