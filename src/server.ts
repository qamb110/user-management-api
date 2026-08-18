import dotenv from 'dotenv';

// Load variables from the .env file into process.env BEFORE importing
// anything else. Other modules (e.g. src/utils/jwt.ts) read env vars like
// JWT_ACCESS_SECRET as soon as they're imported, so dotenv must run first
// or those values would still be undefined at that point.
dotenv.config();

import app from './app';
import { connectDB } from './config/database';
import { logger } from './utils/logger';

// Use the PORT from .env, otherwise default to 3000
const PORT = process.env.PORT || 3000;

// We connect to the database first, and only start listening for requests
// once that succeeds. This avoids serving requests that would fail anyway
// because there is no database to read/write.
const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      logger.info(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    // Exit with a non-zero code so process managers/CI know startup failed.
    process.exit(1);
  }
};

startServer();
