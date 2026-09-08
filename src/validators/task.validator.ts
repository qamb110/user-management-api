import { body, param } from 'express-validator';
import { STATUS_NAMES } from '../models/todoStatus.model';

const statusNameRule = body('status')
  .isIn(STATUS_NAMES)
  .withMessage(`status must be one of: ${STATUS_NAMES.join(', ')}`);

export const createTaskValidation = [
  body('title').trim().notEmpty().withMessage('title is required'),
  body('description').optional().trim(),
  body('assigned_to').isMongoId().withMessage('assigned_to must be a valid user id'),
  statusNameRule.optional(),
];

export const updateTaskStatusValidation = [
  param('id').isMongoId().withMessage('Invalid task id'),
  body('status').notEmpty().withMessage('status is required'),
  statusNameRule,
];
