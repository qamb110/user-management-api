import { Request, Response } from 'express';
import * as userService from '../services/user.service';
import { ServiceError } from '../services/user.service';
import { logger } from '../utils/logger';

export const uploadProfilePicture = async (req: Request, res: Response): Promise<void> => {
  try {
    // req.file is populated by the multer middleware (src/middlewares/upload.ts)
    // that runs before this controller. If it's missing, the client didn't
    // send a file under the expected "image" field.
    if (!req.file) {
      res.status(400).json({ message: 'No image file was uploaded' });
      return;
    }

    // req.user is set by the authenticate middleware, so we know exactly
    // which user this upload belongs to — never trust a user id from the
    // request body for this.
    const userId = req.user!.sub;
    const fileUrl = `/uploads/${req.file.filename}`;

    const user = await userService.updateProfilePicture(userId, fileUrl);

    logger.info('Profile picture uploaded', { userId, filename: req.file.filename });

    res.status(200).json(user);
  } catch (error) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }
    logger.error('Unhandled error in upload controller', { error });
    res.status(500).json({ message: 'Something went wrong' });
  }
};
