import { Router } from 'express';
import * as taskController from '../controllers/task.controller';
import { authenticate, requireAdminRole } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { createTaskValidation, updateTaskStatusValidation } from '../validators/task.validator';

const router = Router();

// Only admins create and assign tasks.
router.post(
  '/',
  authenticate,
  requireAdminRole,
  createTaskValidation,
  validate,
  taskController.createTask,
);

// Any logged-in user can view the board; the service decides whether they
// see everything (admin) or just their own tasks.
router.get('/', authenticate, taskController.getTasks);

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
