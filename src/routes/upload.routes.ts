import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { uploadProfilePicture as uploadMiddleware } from '../middlewares/upload';
import * as uploadController from '../controllers/upload.controller';

const router = Router();

/**
 * @openapi
 * /upload:
 *   post:
 *     summary: Upload a profile picture for the logged-in user
 *     description: >
 *       Accepts one image file (JPEG, PNG, WEBP, or GIF; max 5MB) under the
 *       form field "image", and sets it as the calling user's own
 *       profilePicture. You cannot upload on behalf of another user — the
 *       user is always the one identified by the access token.
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: The user, with profilePicture set to the uploaded file's URL.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: No file uploaded, or the file failed validation (wrong type / too large).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Access token is missing, invalid, or expired.
 */
// Must be logged in; the multer middleware runs after authenticate so it
// can read req.user (used to build the saved filename), then hands off to
// the controller which links the file to that same user's profile.
router.post('/upload', authenticate, uploadMiddleware, uploadController.uploadProfilePicture);

export default router;
