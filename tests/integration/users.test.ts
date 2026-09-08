import request from 'supertest';
import app from '../../src/app';
import { connectTestDB, clearTestDB, closeTestDB } from '../helpers/db';
import { createUser, createAdminAndLogin, createUserAndLogin, VALID_PASSWORD } from '../helpers/factories';

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

describe('POST /users', () => {
  it('creates a user and never returns the password', async () => {
    const { response } = await createUser({ username: 'alice' });

    expect(response.status).toBe(201);
    expect(response.body.username).toBe('alice');
    expect(response.body.role).toBe('user');
    expect(response.body.password).toBeUndefined();
  });

  it('rejects a weak password', async () => {
    const { response } = await createUser({ username: 'weakpw', password: 'weak' });

    expect(response.status).toBe(400);
  });

  it('rejects a duplicate username with 409', async () => {
    await createUser({ username: 'dupe', email: 'dupe1@example.com' });
    const { response } = await createUser({ username: 'dupe', email: 'dupe2@example.com' });

    expect(response.status).toBe(409);
  });

  it('rejects a duplicate email with 409', async () => {
    await createUser({ username: 'first', email: 'same@example.com' });
    const { response } = await createUser({ username: 'second', email: 'same@example.com' });

    expect(response.status).toBe(409);
  });

  it('rejects an invalid role value', async () => {
    const response = await request(app)
      .post('/users')
      .send({ username: 'x', email: 'x@example.com', password: VALID_PASSWORD, role: 'superuser' });

    expect(response.status).toBe(400);
  });

  it('rejects a request missing required fields', async () => {
    const response = await request(app).post('/users').send({ username: 'onlyusername' });

    expect(response.status).toBe(400);
    expect(Array.isArray(response.body.errors)).toBe(true);
  });
});

describe('GET /users', () => {
  it('requires authentication', async () => {
    const response = await request(app).get('/users');
    expect(response.status).toBe(401);
  });

  it('excludes soft-deleted users from the list', async () => {
    const admin = await createAdminAndLogin();
    const { response: created } = await createUser({ username: 'todelete' });

    await request(app)
      .delete(`/users/${created.body._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);

    const list = await request(app).get('/users').set('Authorization', `Bearer ${admin.accessToken}`);

    const usernames = list.body.map((u: { username: string }) => u.username);
    expect(usernames).not.toContain('todelete');
  });
});

describe('GET /users/:id', () => {
  it('returns 404 for a non-existent (but validly formatted) id', async () => {
    const admin = await createAdminAndLogin();
    const fakeId = '507f1f77bcf86cd799439011';

    const response = await request(app)
      .get(`/users/${fakeId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(response.status).toBe(404);
  });

  it('returns 400 for a malformed id', async () => {
    const admin = await createAdminAndLogin();

    const response = await request(app)
      .get('/users/not-a-valid-id')
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(response.status).toBe(400);
  });
});

describe('PUT /users/:id', () => {
  it('is forbidden for a non-admin caller', async () => {
    const regular = await createUserAndLogin();
    const { response: target } = await createUser({ username: 'targetuser' });

    const response = await request(app)
      .put(`/users/${target.body._id}`)
      .set('Authorization', `Bearer ${regular.accessToken}`)
      .send({ username: 'hacked' });

    expect(response.status).toBe(403);
  });

  it('allows an admin to update another user', async () => {
    const admin = await createAdminAndLogin();
    const { response: target } = await createUser({ username: 'updateme' });

    const response = await request(app)
      .put(`/users/${target.body._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ username: 'updated' });

    expect(response.status).toBe(200);
    expect(response.body.username).toBe('updated');
  });

  it('returns 404 when updating a non-existent user', async () => {
    const admin = await createAdminAndLogin();
    const fakeId = '507f1f77bcf86cd799439011';

    const response = await request(app)
      .put(`/users/${fakeId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ username: 'ghost' });

    expect(response.status).toBe(404);
  });
});

describe('DELETE /users/:id', () => {
  it('is forbidden for a non-admin caller', async () => {
    const regular = await createUserAndLogin();
    const { response: target } = await createUser({ username: 'safeuser' });

    const response = await request(app)
      .delete(`/users/${target.body._id}`)
      .set('Authorization', `Bearer ${regular.accessToken}`);

    expect(response.status).toBe(403);
  });

  it('soft-deletes for an admin caller', async () => {
    const admin = await createAdminAndLogin();
    const { response: target } = await createUser({ username: 'deleteme' });

    const response = await request(app)
      .delete(`/users/${target.body._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.isDeleted).toBe(true);
  });
});
