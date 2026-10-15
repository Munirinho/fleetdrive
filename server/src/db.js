'use strict';
// Cached Mongoose connection for serverless (Vercel). Reuses the connection
// across warm instances; avoids reconnecting on every cold start.
const mongoose = require('mongoose');

let cached = global.mongooseConn;
if (!cached) {
  cached = global.mongooseConn = { conn: null, promise: null };
}

async function connectDb(uri) {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 8000 })
      .then((m) => m.connection);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = { connectDb };
