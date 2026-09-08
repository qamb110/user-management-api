import { Router } from 'express';
import * as taskController from '../controllers/task.controller';
import { authenticate, requireAdminRole } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { createTaskValidation, updateTaskStatusValidation } from '../validators/task.validator';

const router = Router();

/**
 * @openapi
 * /tasks:
 *   post:
 *     summary: Create a task and assign it to a user (admin only)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskInput'
 *     responses:
 *       201:
 *         description: The created task.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Validation failed, or assigned_to doesn't refer to an existing user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       401:
 *         description: Access token is missing, invalid, or expired.
 *       403:
 *         description: Caller is authenticated but not an admin.
 */
// Only admins create and assign tasks.
router.post(
  '/',
  authenticate,
  requireAdminRole,
  createTaskValidation,
  validate,
  taskController.createTask,
);

/**
 * @openapi
 * /tasks:
 *   get:
 *     summary: View the todo board
 *     description: >
 *       Admins see every task; any other authenticated user sees only the
 *       tasks assigned to them.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: An array of tasks.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       401:
 *         description: Access token is missing, invalid, or expired.
 */
// Any logged-in user can view the board; the service decides whether they
// see everything (admin) or just their own tasks.
router.get('/', authenticate, taskController.getTasks);

/**
 * @openapi
 * /tasks/{id}/status:
 *   patch:
 *     summary: Update a task's status
 *     description: Allowed for the task's assigned user, or for an admin.
 *     tags: [Tasks]
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
 *             $ref: '#/components/schemas/UpdateTaskStatusInput'
 *     responses:
 *       200:
 *         description: The updated task.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid task id or invalid status name.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       401:
 *         description: Access token is missing, invalid, or expired.
 *       403:
 *         description: Caller is neither the assigned user nor an admin.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Task not found.
 */
// The assigned user or an admin can move a task's status; the service
// layer checks that (it needs to load the task first to know who it's
// assigned to, so that check can't happen in route middleware alone).
router.patch(
  '/:id/status',
  authenticate,
  updateTaskStatusValidation,
  validate,
  taskController.updateTaskStatus,
);

export default router;
