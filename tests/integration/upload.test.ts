import fs from 'fs';
import path from 'path';
import request from 'supertest';
import app from '../../src/app';
import { connectTestDB, clearTestDB, closeTestDB } from '../helpers/db';
import { createUserAndLogin } from '../helpers/factories';
import { UPLOADS_DIR } from '../../src/middlewares/upload';

const FIXTURE_IMAGE = path.join(__dirname, '..', 'fixtures', 'test-image.png');

// multer writes uploaded files to the real uploads/ folder (its destination
// isn't configurable per-environment), so we track every filename this
// suite creates and delete them afterward instead of leaving test files
// sitting in the project's uploads/ directory.
const createdFiles: string[] = [];

const trackAndCleanupLater = (response: request.Response) => {
  if (response.body?.profilePicture) {
    createdFiles.push(path.basename(response.body.profilePicture));
  }
};

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(async () => {
  await closeTestDB();
  for (const filename of createdFiles) {
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

describe('POST /upload', () => {
  it('requires authentication', async () => {
    const response = await request(app).post('/upload').attach('image', FIXTURE_IMAGE);
    expect(response.status).toBe(401);
  });

  it('accepts a valid image and sets it as the profile picture', async () => {
    const { accessToken } = await createUserAndLogin();

    const response = await request(app)
      .post('/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('image', FIXTURE_IMAGE);

    trackAndCleanupLater(response);

    expect(response.status).toBe(200);
    expect(response.body.profilePicture).toMatch(/^\/uploads\//);
  });

  it('rejects a non-image file', async () => {
    const { accessToken } = await createUserAndLogin();

    const response = await request(app)
      .post('/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('image', Buffer.from('just some text'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });

    trackAndCleanupLater(response);

    expect(response.status).toBe(400);
  });

  it('rejects a file over the 5MB size limit', async () => {
    const { accessToken } = await createUserAndLogin();
    const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024, 0);

    const response = await request(app)
      .post('/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('image', oversizedBuffer, { filename: 'big.png', contentType: 'image/png' });

    trackAndCleanupLater(response);

    expect(response.status).toBe(400);
  });

  it('rejects a request with no file attached', async () => {
    const { accessToken } = await createUserAndLogin();

    const response = await request(app).post('/upload').set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
  });
});
