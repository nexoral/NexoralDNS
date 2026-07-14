import logger from '../utilities/logger';
import cluster from "cluster";
import os from "os";
import FastifyServer from "../core/fastify";
import startCronJob from "../CronJob/CronJob";
import container from "../container/appContainer";
import { MongoConnectionManager } from "nexoraldns-shared";
import { MongoCollectionManager } from "../Database/MongoCollectionManager";
import { getJWTSecret } from "../helper/jwt.helper";

const numCPUs: number = os.cpus().length;
const totalUsableCpus: number = Math.max(1, Math.floor(numCPUs * 0.75)); // Use at least 1 CPU, up to 75% of total CPUs
logger.info(`Starting server in cluster mode with ${totalUsableCpus} workers...`);

cluster.schedulingPolicy = cluster.SCHED_RR; // Round-robin

if (cluster.isPrimary) {
  logger.warn(`Master process ${process.pid} is running`);

  // Resolve/generate the JWT secret ONCE in the primary before forking, so every
  // worker reads the same persisted secret (avoids each worker minting its own
  // random secret when the secret file doesn't exist yet).
  getJWTSecret();

  // Initialize MongoDB via DI container
  const mongoConnManager = container.get<MongoConnectionManager>('MongoConnectionManager');
  const mongoCollManager = container.get<MongoCollectionManager>('MongoCollectionManager');

  Promise.all([
    mongoConnManager.connect(),
    mongoCollManager.initialize(),
  ])
    .then(() => {
      // Run the batch cron job in the master process
      startCronJob();

      // Fork workers
      for (let i = 0; i < totalUsableCpus; i++) {
        cluster.fork();
      }
    })
    .catch((error) => {
      logger.error("Master process failed to initialize database:", error);
      process.exit(1);
    });

  // Restart workers if they die, with a short backoff so a worker that crashes
  // on startup can't spin-restart in a tight CPU-burning loop.
  cluster.on("exit", (worker) => {
    logger.info(`Worker ${worker.process.pid} died. Restarting in 1s...`);
    setTimeout(() => cluster.fork(), 1000);
  });
} else {
  // Workers can share any TCP connection
  FastifyServer();
}
