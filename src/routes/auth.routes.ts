import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { loginValidation, refreshTokenValidation } from '../validators/auth.validator';

// This router handles authentication: getting tokens and renewing them.
const router = Router();

router.post('/login', loginValidation, validate, authController.login);

router.post('/refresh-token', refreshTokenValidation, validate, authController.refreshToken);

export default router;
