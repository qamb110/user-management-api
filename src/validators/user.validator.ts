import { body, param } from 'express-validator';
import { isPasswordStrong, PASSWORD_RULE_MESSAGE } from '../utils/password';

// These are express-validator "chains": each one describes a rule for a
// single field, and they run in the order listed before the request reaches
// our controller. The `validate` middleware (src/middlewares/validate.ts)
// collects any failures and turns them into a single 400 response.

// Reused between create and update so both check the password the same way.
// We call the existing isPasswordStrong() helper instead of writing a new
// regex here, so the password rule only lives in one place.
const passwordRule = body('password')
  .custom((value) => isPasswordStrong(value))
  .withMessage(PASSWORD_RULE_MESSAGE);

const roleRule = body('role')
  .isIn(['user', 'admin'])
  .withMessage("role must be either 'user' or 'admin'");

export const createUserValidation = [
  body('username').trim().notEmpty().withMessage('username is required'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('email is required')
    .isEmail()
    .withMessage('email must be a valid email address')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('password is required'),
  passwordRule,
  roleRule.optional(),
];

export const updateUserValidation = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('username').optional().trim().notEmpty().withMessage('username cannot be empty'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('email must be a valid email address')
    .normalizeEmail(),
  body('password')
    .optional()
    .custom((value) => isPasswordStrong(value))
    .withMessage(PASSWORD_RULE_MESSAGE),
  roleRule.optional(),
];

export const userIdValidation = [param('id').isMongoId().withMessage('Invalid user id')];
