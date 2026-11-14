import mongoose from "mongoose";

// Reaproveita a conexão entre invocações da função serverless (Vercel)
// e entre recarregamentos do servidor de desenvolvimento.
const cache = globalThis.__mongoose ?? (globalThis.__mongoose = { conn: null, promise: null });

export async function conectar() {
  if (cache.conn) return cache.conn;
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI não definido nas variáveis de ambiente.");
  }
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(process.env.MONGO_URI, { bufferCommands: false, serverSelectionTimeoutMS: 10000 })
      .catch((err) => {
        cache.promise = null;
        throw err;
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
