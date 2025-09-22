import { MongoClient } from "mongodb";
import { Console } from "outers";
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
  } catch (error) {
    Console.red("Failed to connect to MongoDB:", error);
    throw error;
  }

  // Create the DB and Collection if they don't exist
  const db = client.db("DNS");
  const collections = await db.listCollections({ name: "Records" }).toArray();
  if (collections.length === 0) {
    await db.createCollection("Records");
  }

  // Insert default document if collection is empty
  const recordCollection = db.collection("Records");
  const count = await recordCollection.countDocuments();
  if (count === 0) {
    await recordCollection.insertOne({
      domain: "my.home",
      domainProtocol: "http",
      type: "A",
      TTL: 10,
      value: "192.168.1.1",
    });
  }
  return client;
}