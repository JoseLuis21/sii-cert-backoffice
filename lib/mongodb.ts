import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME ?? "certificacion";

if (!uri) {
  throw new Error("Missing MONGODB_URI in environment variables");
}

declare global {
  var __mongoClientPromise__: Promise<MongoClient> | undefined;
}

const client = new MongoClient(uri);
const clientPromise = global.__mongoClientPromise__ ?? client.connect();

if (!global.__mongoClientPromise__) {
  global.__mongoClientPromise__ = clientPromise;
}

export async function getDb(): Promise<Db> {
  const connectedClient = await clientPromise;
  return connectedClient.db(dbName);
}
