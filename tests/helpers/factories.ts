import request from 'supertest';
import app from '../../src/app';

// A password that satisfies the app's strength rule (upper, lower, number,
// symbol, 8+ chars) — reused across tests instead of retyping it everywhere.
export const VALID_PASSWORD = 'Str0ng!Pass';

interface CreateUserOptions {
  username?: string;
  email?: string;
  password?: string;
  role?: 'user' | 'admin';
}

// Hits the real POST /users endpoint (not the repository directly), so
// tests exercise the same validation/hashing path a real client would.
export const createUser = async (options: CreateUserOptions = {}) => {
  const username = options.username ?? `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const payload = {
    username,
    email: options.email ?? `${username}@example.com`,
    password: options.password ?? VALID_PASSWORD,
    role: options.role,
  };

  const response = await request(app).post('/users').send(payload);
  return { response, username, password: payload.password };
};

export const loginAs = async (username: string, password: string) => {
  const response = await request(app).post('/login').send({ username, password });
  return response;
};

// Convenience for the common case: create + log in as an admin in one call.
export const createAdminAndLogin = async () => {
  const { response: createResponse, username, password } = await createUser({ role: 'admin' });
  const loginResponse = await loginAs(username, password);
  return {
    user: createResponse.body,
    accessToken: loginResponse.body.accessToken as string,
    refreshToken: loginResponse.body.refreshToken as string,
  };
};

export const createUserAndLogin = async () => {
  const { response: createResponse, username, password } = await createUser();
  const loginResponse = await loginAs(username, password);
  return {
    user: createResponse.body,
    accessToken: loginResponse.body.accessToken as string,
    refreshToken: loginResponse.body.refreshToken as string,
  };
};
