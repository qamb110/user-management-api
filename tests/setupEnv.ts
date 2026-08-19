// Jest's `setupFiles` run before any test file (and therefore before the
// app itself) is imported, which is exactly when these need to be set —
// src/utils/jwt.ts reads them as soon as it's imported, the same ordering
// requirement as dotenv.config() in src/server.ts.
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.ACCESS_TOKEN_EXPIRY = '15m';
process.env.REFRESH_TOKEN_EXPIRY = '15d';
