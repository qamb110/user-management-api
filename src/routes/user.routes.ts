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

// Anyone can create a new user (e.g. sign up).
// createUserValidation checks the request body; validate() stops the
// request with a 400 if any of those checks failed.
router.post('/', createUserValidation, validate, userController.createUser);

// Listing/reading users requires a valid access token, but any logged-in
// user (not just admins) is allowed to do it.
router.get('/', authenticate, userController.getUsers);

router.get('/:id', authenticate, userIdValidation, validate, userController.getUserById);

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

router.delete(
  '/:id',
  authenticate,
  requireAdminRole,
  userIdValidation,
  validate,
  userController.softDeleteUser,
);

export default router;
