import { Collection, Document, MongoClient } from "mongodb";
import { ClassBased, Console } from "outers";
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

    // Ensure index on code field for permissions
    await permissionsCol.createIndex({ code: 1 }, { unique: true });

    // 1. Insert permissions with numeric codes if empty
    const existingPerms = await permissionsCol.countDocuments();
    let permissionIds = [];
    if (existingPerms === 0) {
      const result = await permissionsCol.insertMany(DB_DEFAULT_CONFIGS.DefaultValues.DEFAULT_PERMISSIONS_TYPE);
      permissionIds = Object.values(result.insertedIds);
      console.log("✅ Permissions inserted with numeric codes");
    } else {
      const allPerms = await permissionsCol.find().toArray();
      permissionIds = allPerms.map(p => p._id);
      console.log("ℹ️ Permissions already exist");
    }

    // store only super admin permission full access
    permissionIds = permissionIds.filter((_, code) => code === DB_DEFAULT_CONFIGS.DefaultValues.DEFAULT_ADMIN_PERMISSIONS_CODE);

    // 2. Insert Super Admin role if not exists
    let superAdminRole = await rolesCol.findOne({ name: DB_DEFAULT_CONFIGS.DefaultValues.DEFAULT_ADMIN_ROLE });
    if (!superAdminRole) {
      await rolesCol.createIndex({ code: 1 }, { unique: true }); // Ensure unique role codes
      const result = await rolesCol.insertOne({
        code: DB_DEFAULT_CONFIGS.DefaultValues.DEFAULT_ADMIN_ROLE_CODE,
        name: DB_DEFAULT_CONFIGS.DefaultValues.DEFAULT_ADMIN_ROLE,
        permissions: permissionIds,
      });
      superAdminRole = { _id: result.insertedId };
      console.log("✅ Super Admin role created");
    } else {
      console.log("ℹ️ Super Admin role already exists");
    }

    // 3. Insert admin user if not exists
    let adminUser = await usersCol.findOne({ username: DB_DEFAULT_CONFIGS.DefaultValues.DEFAULT_ADMIN_USERNAME });
    if (!adminUser) {
      await usersCol.createIndex({ username: 1 }, { unique: true }); // Ensure unique usernames
      await usersCol.insertOne({
        username: DB_DEFAULT_CONFIGS.DefaultValues.DEFAULT_ADMIN_USERNAME,
        password: await new ClassBased.CryptoGraphy(process.arch).Encrypt(DB_DEFAULT_CONFIGS.DefaultValues.DEFAULT_ADMIN_PASSWORD),
        roleId: superAdminRole._id,
      });
      console.log("✅ Admin user created");
    } else {
      console.log("ℹ️ Admin user already exists");
    }

    console.log("🎉 RBAC setup completed");
    return client;
  } catch (error) {
    Console.red("Failed to connect to MongoDB:", error);
    throw error;
  }

}