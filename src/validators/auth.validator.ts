import { body } from 'express-validator';

export const loginValidation = [
  body('username').trim().notEmpty().withMessage('username is required'),
  body('password').notEmpty().withMessage('password is required'),
];

export const refreshTokenValidation = [
  body('refreshToken').notEmpty().withMessage('refreshToken is required'),
];
