import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { seedDefaultStatuses } from '../../src/repositories/todoStatus.repository';

// Each integration test file gets its own throwaway, in-memory MongoDB
// instance instead of touching the developer's real local/Atlas database.
// This keeps tests fast, isolated, and reproducible (e.g. in CI) without
// needing MongoDB installed or network access to Atlas.
let mongoServer: MongoMemoryServer;

export const connectTestDB = async (): Promise<void> => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  // Mirrors what src/config/database.ts does on real startup, so tests
  // that create tasks have the 4 fixed statuses available to reference.
  await seedDefaultStatuses();
};

// Wipes every collection between individual tests, so one test's data
// never leaks into the next (while keeping the same connection/server open
// for the whole file, which is much faster than reconnecting every time).
// The "todo" collection is skipped — it only ever holds the 4 fixed status
// values seeded once in connectTestDB(), not per-test data.
export const clearTestDB = async (): Promise<void> => {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.entries(collections)
      .filter(([name]) => name !== 'todo')
      .map(([, collection]) => collection.deleteMany({})),
  );
};

export const closeTestDB = async (): Promise<void> => {
  await mongoose.disconnect();
  await mongoServer.stop();
};
