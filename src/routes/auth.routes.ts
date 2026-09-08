import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { loginValidation, refreshTokenValidation } from '../validators/auth.validator';

// This router handles authentication: getting tokens and renewing them.
const router = Router();

/**
 * @openapi
 * /login:
 *   post:
 *     summary: Log in with a username and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Login succeeded; returns an access token, a refresh token, and the user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokens'
 *       400:
 *         description: Missing username or password.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       401:
 *         description: Invalid username or password.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', loginValidation, validate, authController.login);

/**
 * @openapi
 * /refresh-token:
 *   post:
 *     summary: Exchange a refresh token for a new access/refresh token pair
 *     description: >
 *       Implements refresh-token rotation — the refresh token used here is
 *       invalidated, and a brand new one is returned along with the new
 *       access token. Reusing an already-rotated refresh token is rejected.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenInput'
 *     responses:
 *       200:
 *         description: A new access/refresh token pair.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokens'
 *       400:
 *         description: Missing refreshToken field.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       401:
 *         description: Refresh token is invalid, expired, or has already been used/revoked.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/refresh-token', refreshTokenValidation, validate, authController.refreshToken);

export default router;
