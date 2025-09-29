// cluster-dgram-reuse.ts
import cluster from "cluster";
import os from "os";
import handler from "./DNS";
import { Console } from "outers";
const numCPUs = os.cpus().length;
const totalUsableCpus = Math.max(1, Math.floor(numCPUs * 0.75)); // Use at least 1 CPU, up to 75% of total CPUs
Console.green(`Starting DNS server in cluster mode with ${totalUsableCpus} workers...`);


// Fork workers if primary
if (cluster.isPrimary) {
  for (let i = 0; i < totalUsableCpus; i++) {
    cluster.fork();
  }
} else {
  // Workers can share any UDP connection
  handler();
}
