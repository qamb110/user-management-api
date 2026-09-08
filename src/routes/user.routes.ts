import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate, requireAdminRole } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import {
  createUserValidation,
  updateUserValidation,
  userIdValidation,
} from '../validators/user.validator';

// This router handles everything under /users
const router = Router();

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Create a new user (sign up)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserInput'
 *     responses:
 *       201:
 *         description: The created user (password never included).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation failed (missing fields, weak password, invalid email/role).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       409:
 *         description: Username or email is already in use.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Anyone can create a new user (e.g. sign up).
// createUserValidation checks the request body; validate() stops the
// request with a 400 if any of those checks failed.
router.post('/', createUserValidation, validate, userController.createUser);

/**
 * @openapi
 * /users:
 *   get:
 *     summary: List active (non-deleted) users
 *     description: Requires a valid access token; any authenticated user may call this.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: An array of users.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Access token is missing, invalid, or expired.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Listing/reading users requires a valid access token, but any logged-in
// user (not just admins) is allowed to do it.
router.get('/', authenticate, userController.getUsers);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get a single active user by id
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Access token is missing, invalid, or expired.
 *       404:
 *         description: User not found (or soft-deleted).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', authenticate, userIdValidation, validate, userController.getUserById);

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     summary: Update a user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserInput'
 *     responses:
 *       200:
 *         description: The updated user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Access token is missing, invalid, or expired.
 *       403:
 *         description: Caller is authenticated but not an admin.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found.
 */
// Updating/deleting requires a valid access token AND the admin role,
// decoded from the verified JWT (authenticate runs first and sets req.user,
// then requireAdminRole checks it).
router.put(
  '/:id',
  authenticate,
  requireAdminRole,
  updateUserValidation,
  validate,
  userController.updateUser,
);

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Soft-delete a user (admin only)
 *     description: >
 *       Flags the user as deleted instead of removing the document. The
 *       user then disappears from GET /users but the record itself is kept.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The now-soft-deleted user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Access token is missing, invalid, or expired.
 *       403:
 *         description: Caller is authenticated but not an admin.
 *       404:
 *         description: User not found.
 */
router.delete(
  '/:id',
  authenticate,
  requireAdminRole,
  userIdValidation,
  validate,
  userController.softDeleteUser,
);

export default router;
