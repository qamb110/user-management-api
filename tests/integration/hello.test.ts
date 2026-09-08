import request from 'supertest';
import app from '../../src/app';

describe('GET /hello', () => {
  it('returns a 200 with a greeting message', async () => {
    const response = await request(app).get('/hello');
    expect(response.status).toBe(200);
    expect(response.body.message).toMatch(/hello/i);
  });
});
