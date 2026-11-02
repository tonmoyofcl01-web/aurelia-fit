import mongoose from 'mongoose';

let connectionPromise;

/** Connect once and reuse the Mongoose connection across requests. */
export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing from the backend environment.');
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI)
      .then(() => {
        console.log(`MongoDB connected successfully: ${mongoose.connection.host}`);
        return mongoose.connection;
      })
      .catch((error) => {
        connectionPromise = undefined;
        console.error('MongoDB connection failed:', error.message);
        throw error;
      });
  }

  return connectionPromise;
}
