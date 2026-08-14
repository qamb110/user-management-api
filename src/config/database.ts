import mongoose from 'mongoose';

// We keep the database connection logic in one place (instead of writing it
// directly in server.ts) so that if the connection details or logic ever
// change, we only need to update this one file.
export const connectDB = async (): Promise<void> => {
  // The connection string tells mongoose which MongoDB server and database to use.
  // It is read from .env so it is never hardcoded in the source code.
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    // Without a connection string mongoose has nothing to connect to,
    // so we fail fast with a clear message instead of a confusing crash later.
    throw new Error('MONGODB_URI is not defined in the environment variables');
  }

  try {
    // mongoose.connect() opens the connection to MongoDB.
    // We "await" it so the app only continues once the connection is ready.
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    // Re-throw so server.ts knows startup failed and can stop the process.
    throw error;
  }
};
