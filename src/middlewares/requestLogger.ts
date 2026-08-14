import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Logs every request that comes through the app: method, path, the status
// code it ended with, and how long it took. This runs for ALL routes (it's
// registered first in app.ts), separate from the specific event logs
// (login, upload, etc.) which capture WHY something happened rather than
// just THAT a request happened.
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();

  // "finish" fires once the response has actually been sent, so this is
  // where we know the final status code and can measure the full duration.
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs.toFixed(1)}ms`;

    // 5xx = something broke on our end, 4xx = a bad/rejected request,
    // anything else is routine traffic.
    if (res.statusCode >= 500) {
      logger.error(message);
    } else if (res.statusCode >= 400) {
      logger.warn(message);
    } else {
      logger.info(message);
    }
  });

  next();
};
