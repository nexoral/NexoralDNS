import { MongoClient } from "mongodb";
import { ClassBased, Console } from "outers";
const connections = new Map<string, MongoClient>();


export const getMongoClient = () => {
  const mongoURL = process.env.MONGO_URI || "mongodb://localhost:27017";
  const client = new MongoClient(mongoURL);
  if (!connections.has(mongoURL)) {
    connections.set(mongoURL, client);
  } else {
    return connections.get(mongoURL) as MongoClient;
  }
  return client;
}


export default async () => {
  const client = getMongoClient();
  
  try {
    await client.connect();
    Console.green("Connected to MongoDB successfully.");

    const db = client.db("nexoral_db");
    // Create the DB and Collection if they don't exist
    const permissionsCol = db.collection("permissions");
    const rolesCol = db.collection("roles");
    const usersCol = db.collection("users");

    // Ensure index on code field for permissions
    await permissionsCol.createIndex({ code: 1 }, { unique: true });

    // 1. Insert permissions with numeric codes if empty
    const existingPerms = await permissionsCol.countDocuments();
    let permissionIds = [];
    if (existingPerms === 0) {
      const permissions = [
        { code: 1, name: "Add Domain" },
        { code: 2, name: "Remove Domain" },
        { code: 3, name: "View Logs" },
        { code: 4, name: "Full Access" },
      ];
      const result = await permissionsCol.insertMany(permissions);
      permissionIds = Object.values(result.insertedIds);
      console.log("✅ Permissions inserted with numeric codes");
    } else {
      const allPerms = await permissionsCol.find().toArray();
      permissionIds = allPerms.map(p => p._id);
      console.log("ℹ️ Permissions already exist");
    }

    // 2. Insert Super Admin role if not exists
    let superAdminRole = await rolesCol.findOne({ name: "Super Admin" });
    if (!superAdminRole) {
      const result = await rolesCol.insertOne({
        name: "Super Admin",
        permissions: permissionIds,
      });
      superAdminRole = { _id: result.insertedId };
      console.log("✅ Super Admin role created");
    } else {
      console.log("ℹ️ Super Admin role already exists");
    }

    // 3. Insert admin user if not exists
    let adminUser = await usersCol.findOne({ username: "admin" });
    if (!adminUser) {
      await usersCol.insertOne({
        username: "admin",
        password: await new ClassBased.CryptoGraphy(process.arch).Encrypt("admin"),
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