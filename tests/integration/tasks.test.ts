import request from 'supertest';
import app from '../../src/app';
import { connectTestDB, clearTestDB, closeTestDB } from '../helpers/db';
import { createAdminAndLogin, createUserAndLogin } from '../helpers/factories';

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

describe('POST /tasks', () => {
  it('is forbidden for a non-admin caller', async () => {
    const regular = await createUserAndLogin();

    const response = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${regular.accessToken}`)
      .send({ title: 'Do something', assigned_to: regular.user._id });

    expect(response.status).toBe(403);
  });

  it('rejects an assigned_to that does not refer to a real user', async () => {
    const admin = await createAdminAndLogin();
    const fakeUserId = '507f1f77bcf86cd799439011';

    const response = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ title: 'Orphan task', assigned_to: fakeUserId });

    expect(response.status).toBe(400);
  });

  it('creates a task defaulting to Backlog status when none is given', async () => {
    const admin = await createAdminAndLogin();
    const worker = await createUserAndLogin();

    const response = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ title: 'Write report', assigned_to: worker.user._id });

    expect(response.status).toBe(201);
    expect(response.body.status.name).toBe('Backlog');
    expect(response.body.assigned_to._id).toBe(worker.user._id);
  });

  it('rejects an invalid status name', async () => {
    const admin = await createAdminAndLogin();
    const worker = await createUserAndLogin();

    const response = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ title: 'Bad status', assigned_to: worker.user._id, status: 'NotAStatus' });

    expect(response.status).toBe(400);
  });
});

describe('GET /tasks', () => {
  it('lets an admin see every task, but a regular user only their own', async () => {
    const admin = await createAdminAndLogin();
    const worker1 = await createUserAndLogin();
    const worker2 = await createUserAndLogin();

    await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ title: 'For worker1', assigned_to: worker1.user._id });
    await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ title: 'For worker2', assigned_to: worker2.user._id });

    const adminView = await request(app).get('/tasks').set('Authorization', `Bearer ${admin.accessToken}`);
    expect(adminView.body).toHaveLength(2);

    const worker1View = await request(app)
      .get('/tasks')
      .set('Authorization', `Bearer ${worker1.accessToken}`);
    expect(worker1View.body).toHaveLength(1);
    expect(worker1View.body[0].title).toBe('For worker1');
  });

  it('requires authentication', async () => {
    const response = await request(app).get('/tasks');
    expect(response.status).toBe(401);
  });
});

describe('PATCH /tasks/:id/status', () => {
  const createTaskFor = async (adminToken: string, userId: string) => {
    const response = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Some task', assigned_to: userId });
    return response.body._id as string;
  };

  it('allows the assigned user to update the status', async () => {
    const admin = await createAdminAndLogin();
    const worker = await createUserAndLogin();
    const taskId = await createTaskFor(admin.accessToken, worker.user._id);

    const response = await request(app)
      .patch(`/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${worker.accessToken}`)
      .send({ status: 'InProgress' });

    expect(response.status).toBe(200);
    expect(response.body.status.name).toBe('InProgress');
  });

  it('allows an admin to update the status of any task', async () => {
    const admin = await createAdminAndLogin();
    const worker = await createUserAndLogin();
    const taskId = await createTaskFor(admin.accessToken, worker.user._id);

    const response = await request(app)
      .patch(`/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ status: 'Completed' });

    expect(response.status).toBe(200);
    expect(response.body.status.name).toBe('Completed');
  });

  it('is forbidden for an unrelated, non-admin user', async () => {
    const admin = await createAdminAndLogin();
    const worker = await createUserAndLogin();
    const bystander = await createUserAndLogin();
    const taskId = await createTaskFor(admin.accessToken, worker.user._id);

    const response = await request(app)
      .patch(`/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${bystander.accessToken}`)
      .send({ status: 'InProgress' });

    expect(response.status).toBe(403);
  });

  it('rejects an invalid status name', async () => {
    const admin = await createAdminAndLogin();
    const worker = await createUserAndLogin();
    const taskId = await createTaskFor(admin.accessToken, worker.user._id);

    const response = await request(app)
      .patch(`/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${worker.accessToken}`)
      .send({ status: 'NotAStatus' });

    expect(response.status).toBe(400);
  });

  it('returns 404 for a non-existent task', async () => {
    const worker = await createUserAndLogin();
    const fakeTaskId = '507f1f77bcf86cd799439011';

    const response = await request(app)
      .patch(`/tasks/${fakeTaskId}/status`)
      .set('Authorization', `Bearer ${worker.accessToken}`)
      .send({ status: 'InProgress' });

    expect(response.status).toBe(404);
  });
});
