import { Collection, Document as MongoDocument, MongoClient } from "mongodb";
import { Console } from "outers";
import {DB_DEFAULT_CONFIGS} from "../Config/key";
const connections = new Map<string, MongoClient>();
const DB_clients = new Map<string, MongoClient>();
const Collection_clients = new Map<string, Collection<MongoDocument>>();

export const getMongoClient = () => {
  const mongoURL = process.env.MONGO_URI || "mongodb://localhost:27017";
  const client = new MongoClient(mongoURL);
  if (!connections.has(mongoURL)) {
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

  
  return client;
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
  return Collection_clients.get(collectionName);
}


export default async () => {
  const client = getMongoClient();
  
  try {
    await client.connect();
    Console.green("Connected to MongoDB successfully.");
  } catch (error) {
    Console.red("Failed to connect to MongoDB:", error);
    throw error;
  }
  return client;
}