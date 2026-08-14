import * as userRepository from '../repositories/user.repository';
import * as refreshTokenRepository from '../repositories/refreshToken.repository';
import { toSafeUser, ServiceError } from './user.service';
import { comparePassword } from '../utils/password';
import { logger } from '../utils/logger';
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiryDate,
  verifyRefreshToken,
} from '../utils/jwt';

// Bundles both tokens together so callers (the controller) don't have to
// know the individual field names.
interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Creates a new access + refresh token pair for a user and persists the
// refresh token's metadata (jti) so it can be looked up/revoked later.
const issueTokenPair = async (
  user: Parameters<typeof generateAccessToken>[0],
): Promise<TokenPair> => {
  const accessToken = generateAccessToken(user);
  const { token: refreshToken, jti } = generateRefreshToken(user);

  await refreshTokenRepository.createRefreshToken(
    user._id.toString(),
    jti,
    getRefreshTokenExpiryDate(),
  );

  return { accessToken, refreshToken };
};

export const login = async (username: string, password: string) => {
  const user = await userRepository.findActiveUserByUsername(username);

  // We deliberately use the same generic error message whether the
  // username doesn't exist or the password is wrong. Being specific (e.g.
  // "no such user") would let an attacker discover which usernames are
  // registered just by trying logins.
  if (!user) {
    logger.warn('Login failed: unknown username', { username });
    throw new ServiceError('Invalid username or password', 401);
  }

  const passwordMatches = await comparePassword(password, user.password);
  if (!passwordMatches) {
    logger.warn('Login failed: wrong password', { username });
    throw new ServiceError('Invalid username or password', 401);
  }

  const tokens = await issueTokenPair(user);

  logger.info('User logged in', { userId: user._id.toString(), username });

  return { ...tokens, user: toSafeUser(user) };
};

export const refreshToken = async (oldToken: string) => {
  let payload;
  try {
    payload = verifyRefreshToken(oldToken);
  } catch {
    // Covers an expired token, a bad signature, or a malformed token —
    // in all cases the caller must log in again.
    logger.warn('Refresh token rejected: invalid or expired token');
    throw new ServiceError('Invalid or expired refresh token', 401);
  }

  const storedToken = await refreshTokenRepository.findByJti(payload.jti);

  if (!storedToken) {
    logger.warn('Refresh token rejected: unknown jti', { userId: payload.sub });
    throw new ServiceError('Invalid or expired refresh token', 401);
  }

  if (storedToken.revoked) {
    // This token was already used once (rotation revokes it after use) or
    // was manually revoked. Seeing it again is a strong signal it was
    // stolen and the real owner already rotated past it — or an attacker
    // is replaying a captured token. Either way we revoke every other
    // active token for this user, forcing a fresh login everywhere.
    logger.warn('Refresh token reuse detected — revoking all tokens for user', {
      userId: payload.sub,
    });
    await refreshTokenRepository.revokeAllForUser(payload.sub);
    throw new ServiceError('Invalid or expired refresh token', 401);
  }

  const user = await userRepository.findActiveUserById(payload.sub);
  if (!user) {
    throw new ServiceError('Invalid or expired refresh token', 401);
  }

  // Rotation: retire the token that was just used before issuing a new one,
  // so it can never be redeemed a second time.
  await refreshTokenRepository.revokeByJti(payload.jti);

  logger.info('Refresh token rotated', { userId: payload.sub });

  return issueTokenPair(user);
};
