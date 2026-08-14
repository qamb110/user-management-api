import { RefreshToken, IRefreshToken } from '../models/refreshToken.model';

// Same rule as user.repository.ts: this is the only file allowed to query
// the RefreshToken model directly.

export const createRefreshToken = (
  userId: string,
  jti: string,
  expiresAt: Date,
): Promise<IRefreshToken> => {
  return RefreshToken.create({ user: userId, jti, expiresAt });
};

export const findByJti = (jti: string): Promise<IRefreshToken | null> => {
  return RefreshToken.findOne({ jti });
};

export const revokeByJti = (jti: string): Promise<IRefreshToken | null> => {
  return RefreshToken.findOneAndUpdate({ jti }, { revoked: true }, { new: true });
};

// Used for reuse-detection: if a stolen refresh token gets replayed after
// rotation, we revoke every other active token for that user so the
// attacker (and the legitimate user) are forced to log in again.
export const revokeAllForUser = (userId: string): Promise<unknown> => {
  return RefreshToken.updateMany({ user: userId, revoked: false }, { revoked: true });
};
