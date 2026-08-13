import { Router, Request, Response } from 'express';

// This router only handles the /hello endpoint
const router = Router();

// GET /hello -> returns a simple JSON greeting message
router.get('/hello', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Hello, welcome to the User Management API!' });
});

export default router;
