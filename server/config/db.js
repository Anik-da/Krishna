import mongoose from 'mongoose';
import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}
import dotenv from 'dotenv';
dotenv.config();

let isConnected = false;
let connectionError = null;

// Ensure mongoose never freezes requests waiting for connection
mongoose.set('bufferCommands', false);
mongoose.set('strictQuery', false);

const DIRECT_ATLAS_URI = process.env.DIRECT_MONGODB_URI || process.env.MONGODB_URI;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.includes('<your-cluster-url>') || uri.includes('<cluster-url>')) {
    connectionError = "MongoDB URI contains placeholder. Please set your actual cluster URL in .env";
    console.warn("\x1b[33m[MongoDB Atlas]\x1b[0m " + connectionError);
    return false;
  }

  // 1. Try standard configured URI
  try {
    mongoose.set('strictQuery', false);
    mongoose.set('bufferCommands', false);
    const conn = await mongoose.connect(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      family: 4
    });

    isConnected = true;
    connectionError = null;
    console.log(`\x1b[32m[MongoDB Atlas Connected]\x1b[0m Host: ${conn.connection.host}, DB: ${conn.connection.name}`);
    return true;
  } catch (srvError) {
    console.warn(`[MongoDB Atlas SRV DNS note]: ${srvError.message}. Connecting via direct replica set seedlist...`);

    // 2. Direct replica set connection (bypasses SRV DNS issues)
    try {
      const conn = await mongoose.connect(DIRECT_ATLAS_URI, {
        maxPoolSize: 10,
        minPoolSize: 2,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 10000,
        family: 4
      });

      isConnected = true;
      connectionError = null;
      console.log(`\x1b[32m[MongoDB Atlas Connected (Direct Replica Set)]\x1b[0m Host: ${conn.connection.host}, DB: ${conn.connection.name}`);
      return true;
    } catch (directError) {
      isConnected = false;
      connectionError = directError.message;
      console.warn(`\x1b[31m[MongoDB Atlas Notice]\x1b[0m Could not connect to Atlas: ${directError.message}`);
      return false;
    }
  }
};

export const getDBStatus = () => ({
  connected: isConnected,
  error: connectionError,
  host: isConnected ? mongoose.connection?.host : null,
  dbName: isConnected ? mongoose.connection?.name : null,
  readyState: mongoose.connection.readyState // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
});
