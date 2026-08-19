import request from 'supertest';
import app from '../../src/app';
import { connectTestDB, clearTestDB, closeTestDB } from '../helpers/db';
import { createUser, loginAs, VALID_PASSWORD } from '../helpers/factories';

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

describe('POST /login', () => {
  it('logs in with correct credentials and returns both tokens', async () => {
    const { username } = await createUser();

    const response = await loginAs(username, VALID_PASSWORD);

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
    expect(response.body.user.username).toBe(username);
    expect(response.body.user.password).toBeUndefined();
  });

  it('rejects a wrong password with a generic 401', async () => {
    const { username } = await createUser();

    const response = await loginAs(username, 'WrongPass1!');

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/invalid username or password/i);
  });

  it('rejects an unknown username with the same generic 401', async () => {
    const response = await loginAs('nobody-with-this-name', 'WrongPass1!');

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/invalid username or password/i);
  });

  it('rejects a request missing the password field', async () => {
    const response = await request(app).post('/login').send({ username: 'alice' });

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(expect.arrayContaining([expect.stringMatching(/password/i)]));
  });
});

describe('POST /refresh-token', () => {
  it('rotates: returns a new pair, and rejects reusing the old refresh token', async () => {
    const { username } = await createUser();
    const login = await loginAs(username, VALID_PASSWORD);
    const oldRefreshToken = login.body.refreshToken;

    const rotated = await request(app).post('/refresh-token').send({ refreshToken: oldRefreshToken });

    expect(rotated.status).toBe(200);
    expect(rotated.body.accessToken).toEqual(expect.any(String));
    expect(rotated.body.refreshToken).toEqual(expect.any(String));
    expect(rotated.body.refreshToken).not.toBe(oldRefreshToken);

    // Replaying the already-rotated token must now be rejected.
    const replay = await request(app).post('/refresh-token').send({ refreshToken: oldRefreshToken });
    expect(replay.status).toBe(401);
  });

  it('rejects a garbage refresh token', async () => {
    const response = await request(app)
      .post('/refresh-token')
      .send({ refreshToken: 'this-is-not-a-real-jwt' });

    expect(response.status).toBe(401);
  });

  it('rejects a missing refreshToken field', async () => {
    const response = await request(app).post('/refresh-token').send({});

    expect(response.status).toBe(400);
  });
});
