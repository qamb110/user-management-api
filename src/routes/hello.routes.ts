import { Router, Request, Response } from 'express';

// This router only handles the /hello endpoint
const router = Router();

/**
 * @openapi
 * /hello:
 *   get:
 *     summary: Health check / greeting
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: A greeting message.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Hello, welcome to the User Management API!
 */
router.get('/hello', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Hello, welcome to the User Management API!' });
});

export default router;
