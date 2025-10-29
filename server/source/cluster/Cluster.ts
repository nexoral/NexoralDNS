import cluster from "cluster";
import os from "os";
import FastifyServer from "../core/fastify";
import { Console } from "outers";
const numCPUs: number = os.cpus().length;
const totalUsableCpus: number = Math.max(1, Math.floor(numCPUs * 0.75)); // Use at least 1 CPU, up to 75% of total CPUs
Console.green(`Starting server in cluster mode with ${totalUsableCpus} workers...`);

cluster.schedulingPolicy = cluster.SCHED_RR; // Round-robin

if (cluster.isPrimary) {
  Console.yellow(`Master process ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < totalUsableCpus; i++) {
    cluster.fork();
  }

  // Restart workers if they die
  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  // Workers can share any TCP connection
  FastifyServer();
}
