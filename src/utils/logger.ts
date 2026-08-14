import winston from 'winston';
import path from 'path';
import fs from 'fs';

// One shared logger for the whole app, instead of every file calling
// console.log/console.error directly. This gives us consistent formatting,
// log levels, and one place to change WHERE logs go (console, files, or
// later something like a log aggregation service) without touching every
// file that logs something.
const LOGS_DIR = path.join(__dirname, '..', '..', 'logs');

// Winston's file transport doesn't create the folder for us, so make sure
// it exists before we try to write into it.
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// LOG_LEVEL lets us control verbosity per environment (e.g. "debug" while
// developing, "info" or "warn" in production) without changing code.
// Winston's built-in levels, from most to least severe: error, warn, info,
// http, verbose, debug, silly.
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Human-readable format for the console: "2024-01-01 12:00:00 [INFO]: message"
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaString}`;
  }),
);

// Structured JSON for the files: easier for a log viewer / aggregator to
// parse later than plain text would be.
const fileFormat = winston.format.combine(winston.format.timestamp(), winston.format.json());

export const logger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    // Only error-level logs, so it's quick to scan for what went wrong.
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'error.log'),
      level: 'error',
      format: fileFormat,
    }),
    // Every log, regardless of level — the full history.
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'combined.log'),
      format: fileFormat,
    }),
  ],
});
