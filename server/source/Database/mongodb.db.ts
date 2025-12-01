import { Collection, Document, MongoClient } from "mongodb";
import { ClassBased, Console,  } from "outers";
import Bcrypt from "../helper/bcrypt.helper";
import { DB_DEFAULT_CONFIGS } from "../core/key";
const connections = new Map<string, MongoClient>();
const DB_clients = new Map<string, MongoClient>();
const Collection_clients = new Map<string, Collection<Document>>();


/**
 * Retrieves a MongoDB client instance for the specified URL.
 * 
 * If a client already exists for the URL in the connections Map, it returns the existing client.
 * Otherwise, it creates a new client, stores it in the connections Map, and returns the new client.
 * 
 * @returns {MongoClient} A MongoDB client instance
 */
export const getMongoClient = (): MongoClient => {
  const mongoURL = DB_DEFAULT_CONFIGS.HOST;
  const client = new MongoClient(mongoURL);
  if (!connections.has(mongoURL)) {
    connections.set(mongoURL, client);
  } else {
    return connections.get(mongoURL) as MongoClient;
  }
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
export const getCollectionClient = (collectionName: string): Collection<Document> | undefined => {
  return Collection_clients.get(collectionName);
}


/**
 * Initializes the MongoDB connection and sets up the database with required collections and default data.
 * 
 * This function performs the following operations:
 * 1. Connects to the MongoDB server
 * 2. Creates necessary collections if they don't exist:
 *    - Permissions collection
 *    - Roles collection
 *    - Users collection
 * 3. Sets up indexes for optimization:
 *    - Unique index on 'code' field for permissions
 *    - Unique index on 'code' field for roles
 *    - Unique index on 'username' field for users
 * 4. Populates default data if collections are empty:
 *    - Default permissions with numeric codes
 *    - Super Admin role with full access permissions
 *    - Admin user with encrypted password
 * 
 * The function implements a Role-Based Access Control (RBAC) system with
 * permissions, roles, and users as the core entities.
 * 
 * @returns {Promise<MongoClient>} A promise that resolves to the connected MongoDB client
 * @throws {Error} If the connection to MongoDB fails
 */
export default async () => {
  const client = getMongoClient();
  
  try {
    await client.connect();
    Console.green("Connected to MongoDB successfully.");

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

    // create Indexes
    await serviceCol.createIndex({ Service_Status: 1 }, { unique: true });
    await permissionsCol.createIndex({ code: 1 }, { unique: true });
    await rolesCol.createIndex({ code: 1 }, { unique: true }); // Ensure unique role codes
    await usersCol.createIndex({ username: 1 }, { unique: true }); // Ensure unique usernames


    // Analytics
    await DnsAnalyticsCol.createIndex({ timestamp: 1 })
    await DnsAnalyticsCol.createIndex({ Status: 1 })
    await DnsAnalyticsCol.createIndex({ queryType: 1 })
    await DnsAnalyticsCol.createIndex({ From: 1 })
    await DnsAnalyticsCol.createIndex({ duration: 1 })

    await DnsAnalyticsCol.createIndex({ timestamp: 1, Status: 1 })
    await DnsAnalyticsCol.createIndex({ timestamp: 1, queryType: 1 })
    await DnsAnalyticsCol.createIndex({ timestamp: -1 })

    // Domains
    await domainsCol.createIndex({ domainStatus: 1 })

    // DNS Records
    await dnsRecordsCol.createIndex({ domainId: 1 })


    // 1. Insert permissions with numeric codes if empty
    const existingPerms = await permissionsCol.countDocuments();
    let InsertedPermissions = [];
    if (existingPerms === 0) {
      for (const perm of DB_DEFAULT_CONFIGS.DefaultValues.DEFAULT_PERMISSIONS_TYPE) {
        const result = await permissionsCol.insertOne(perm);

        // Find the newly inserted permission
        const NewPerm = await permissionsCol.findOne({ _id: result.insertedId });
        if (!NewPerm) throw new Error("Failed to retrieve the permission after insertion.");
        InsertedPermissions.push(NewPerm);
      }
      console.log("✅ Permissions inserted with numeric codes");
    } else {
      const allPerms = await permissionsCol.find().toArray();
      InsertedPermissions = allPerms.map(p => p);
      console.log("ℹ️ Permissions already exist");
    }

    // 2. Insert role if not exists
    let allRoles = await rolesCol.countDocuments();
    let InsertedRoles = [];
    if (allRoles === 0) {
      for (const role of DB_DEFAULT_CONFIGS.DefaultValues.DefaultRoles) {
        const result = await rolesCol.insertOne({
          code: role.code,
          name: role.role,
          permissions: InsertedPermissions.filter(p => role.permissions.includes(p.code)).map(p => p._id),
        });

        // Find the newly inserted role
        const NewRole = await rolesCol.findOne({ _id: result.insertedId });
        if (!NewRole) throw new Error("Failed to retrieve the Super Admin role after insertion.");
        InsertedRoles.push(NewRole);
      }
      console.log("✅ Default roles created");
    } else {
      console.log("ℹ️ Default roles already exist");
    }

    // 3. Insert admin user if not exists
    let adminUser = await usersCol.findOne({ username: DB_DEFAULT_CONFIGS.DefaultValues.DEFAULT_ADMIN_USERNAME });
    if (!adminUser) {
      await usersCol.insertOne({
        username: DB_DEFAULT_CONFIGS.DefaultValues.DEFAULT_ADMIN_USERNAME,
        password: await new Bcrypt().Encrypt(DB_DEFAULT_CONFIGS.DefaultValues.DEFAULT_ADMIN_PASSWORD),
        roleId: InsertedRoles.find(r => r.name === DB_DEFAULT_CONFIGS.DefaultValues.DEFAULT_ADMIN_ROLE)?._id,
        passwordUpdatedAt: null,
        createdAt: Date.now(),
      });
      console.log("✅ Admin user created");
    } else {
      console.log("ℹ️ Admin user already exists");
    }

    // Insert default service config if not exists
    const serviceConfig = await serviceCol.findOne({ SERVICE_NAME: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.SERVICE_NAME });
    if (!serviceConfig) {
      await serviceCol.insertOne({
        SERVICE_NAME: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.SERVICE_NAME,
        CLOUD_URL: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.CLOUD_URL,
        apiKey: await new ClassBased.CryptoGraphy(process.arch).Encrypt(DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.API_KEY),
        createdAt: Date.now(),
        Service_Status: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.Service_Status,
        Connected_At: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.Connected_At,
        Disconnected_At: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.Disconnected_At,
        Last_Synced_At: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.Last_Synced_At,
        Next_Expected_Sync_At: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.Next_Expected_Sync_At,
        Total_Connected_Devices_To_Router: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.Total_Connected_Devices_To_Router,
        List_of_Connected_Devices_Info: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.List_of_Connected_Devices_Info
      });
      console.log("✅ Default service config created");
    }

    console.log("🎉 RBAC setup completed");
    return client;
  } catch (error) {
    Console.red("Failed to connect to MongoDB:", error);
    throw error;
  }

}