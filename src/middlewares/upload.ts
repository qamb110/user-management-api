import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

// Where uploaded files end up on disk. Using an absolute path (relative to
// this file, not the current working directory) means it works no matter
// where the app is started from.
export const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// multer won't create the folder for us, so make sure it exists before any
// upload request comes in.
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Only these image types are accepted. Anything else (e.g. a .txt or .exe
// renamed to look like an image) is rejected before it's even saved.
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, UPLOADS_DIR);
  },
  filename: (req: Request, file, callback) => {
    // We build our own filename instead of trusting the one the client
    // sent. This avoids two problems: two users uploading "photo.jpg" would
    // otherwise overwrite each other, and a crafted filename (e.g. containing
    // "../") could otherwise be used to write outside the uploads folder.
    const userId = req.user?.sub ?? 'unknown';
    const extension = path.extname(file.originalname);
    const uniqueName = `${userId}-${Date.now()}${extension}`;
    callback(null, uniqueName);
  },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, callback) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(new Error('Only JPEG, PNG, WEBP, or GIF images are allowed'));
    return;
  }
  callback(null, true);
};

// The raw multer middleware: expects a single file sent under the form
// field name "image".
const singleImageUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
}).single('image');

// multer reports problems (wrong file type, file too big) by calling
// next(err) with its own error object. Without this wrapper, that error
// would fall through to Express's default HTML error page instead of a
// clean JSON response, so we catch it here and turn it into a normal 400.
export const uploadProfilePicture = (req: Request, res: Response, next: NextFunction): void => {
  singleImageUpload(req, res, (err: unknown) => {
    if (err instanceof Error) {
      res.status(400).json({ message: err.message });
      return;
    }
    next();
  });
};
