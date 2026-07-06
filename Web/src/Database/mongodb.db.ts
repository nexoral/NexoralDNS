import { Collection, Document as MongoDocument, MongoClient } from "mongodb";
import { Console } from "outers";
import os from "os";
import {DB_DEFAULT_CONFIGS} from "../Config/key";
const connections = new Map<string, MongoClient>();
const DB_clients = new Map<string, MongoClient>();
const Collection_clients = new Map<string, Collection<MongoDocument>>();

/**
 * Computes a MongoDB connection pool size for this worker process, scaled to
 * cluster width so aggregate connections across all workers (Cluster.ts forks
 * floor(cpus * 0.75) of them) stay within a sane ceiling for a single MongoDB
 * instance serving fast, single-document DNS lookups — instead of every worker
 * independently defaulting to the driver's maxPoolSize of 100 regardless of
 * how many workers are running.
 */
const computeMongoPoolSize = (): number => {
  const TOTAL_CONNECTION_BUDGET = 200; // aggregate connections targeted across the whole cluster
  const MIN_POOL_PER_WORKER = 20;
  const MAX_POOL_PER_WORKER = 50; // driver default is 100; DNS lookups are single fast ops, not bulk queries

  const totalUsableCpus = Math.max(1, Math.floor(os.cpus().length * 0.75));
  const perWorker = Math.floor(TOTAL_CONNECTION_BUDGET / totalUsableCpus);

  return Math.min(MAX_POOL_PER_WORKER, Math.max(MIN_POOL_PER_WORKER, perWorker));
}


/**
 * Retrieves a MongoDB database client for the specified database name.
 * 
 * @param dbName - The name of the database to retrieve the client for
 * @returns The MongoDB database client instance associated with the given database name,
 *          or undefined if no client exists for the specified name
 */
export const getDBClient = (dbName: string): MongoClient | undefined => {
  return DB_clients.get(dbName);
}

/**
 * Retrieves a MongoDB Collection client by name.
 * 
 * @param collectionName - The name of the collection to retrieve
 * @returns The Collection client if found, otherwise undefined
 */
export const getCollectionClient = (collectionName: string): Collection<MongoDocument> | undefined => {
   const collection = Collection_clients.get(collectionName);
   if (!collection) {
     console.warn(`Collection not found: ${collectionName}`);
   }
   return collection;
}


export default async () => {
  const mongoURL = process.env.MONGO_URI || "mongodb://localhost:27017";
  const client = new MongoClient(mongoURL, { maxPoolSize: computeMongoPoolSize() });
  try {
    if (!connections.has(mongoURL)) {
      await client.connect();
      Console.green("Connected to MongoDB successfully.");
      connections.set(mongoURL, client);
    } else {
      return connections.get(mongoURL) as MongoClient;
    }

    const db = client.db(DB_DEFAULT_CONFIGS.DB_NAME);
    DB_clients.set(DB_DEFAULT_CONFIGS.DB_NAME, client);

    // Create the DB and Collection if they don't exist
    const permissionsCol = db.collection(DB_DEFAULT_CONFIGS.Collections.PERMISSIONS);
    Collection_clients.set(DB_DEFAULT_CONFIGS.Collections.PERMISSIONS, permissionsCol);
    const rolesCol = db.collection(DB_DEFAULT_CONFIGS.Collections.ROLES);
    Collection_clients.set(DB_DEFAULT_CONFIGS.Collections.ROLES, rolesCol);
    const usersCol = db.collection(DB_DEFAULT_CONFIGS.Collections.USERS);
    Collection_clients.set(DB_DEFAULT_CONFIGS.Collections.USERS, usersCol);
    const serviceCol = db.collection(DB_DEFAULT_CONFIGS.Collections.SERVICE);
    Collection_clients.set(DB_DEFAULT_CONFIGS.Collections.SERVICE, serviceCol);
    const domainsCol = db.collection(DB_DEFAULT_CONFIGS.Collections.DOMAINS);
    Collection_clients.set(DB_DEFAULT_CONFIGS.Collections.DOMAINS, domainsCol);
    const dnsRecordsCol = db.collection(DB_DEFAULT_CONFIGS.Collections.DNS_RECORDS);
    Collection_clients.set(DB_DEFAULT_CONFIGS.Collections.DNS_RECORDS, dnsRecordsCol);
    const DnsAnalyticsCol = db.collection(DB_DEFAULT_CONFIGS.Collections.ANALYTICS);
    Collection_clients.set(DB_DEFAULT_CONFIGS.Collections.ANALYTICS, DnsAnalyticsCol);
    
  } catch (error) {
    Console.red("Failed to connect to MongoDB:", error);
    throw error;
  }
  return client;
}