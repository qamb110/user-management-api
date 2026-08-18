import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { uploadProfilePicture as uploadMiddleware } from '../middlewares/upload';
import * as uploadController from '../controllers/upload.controller';

const router = Router();

// Must be logged in; the multer middleware runs after authenticate so it
// can read req.user (used to build the saved filename), then hands off to
// the controller which links the file to that same user's profile.
router.post('/upload', authenticate, uploadMiddleware, uploadController.uploadProfilePicture);

export default router;
