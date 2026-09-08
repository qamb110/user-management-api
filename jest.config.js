/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  // Sets env vars (JWT secrets, expiry) before any test file imports the
  // app, since src/utils/jwt.ts reads them as soon as it's imported.
  setupFiles: ['<rootDir>/tests/setupEnv.ts'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    // Bootstrap/static-config files: no real branch logic to unit test,
    // and server.ts/database.ts need a real listening server / real DB
    // driver behavior rather than anything worth mocking.
    '!src/server.ts',
    '!src/config/database.ts',
    '!src/config/swagger.ts',
  ],
  coverageThreshold: {
    global: {
      lines: 60,
      statements: 60,
      functions: 60,
      branches: 55,
    },
  },
  // mongodb-memory-server downloads a MongoDB binary the first time it
  // runs, which can take a while — give tests room instead of timing out.
  testTimeout: 30000,
};
