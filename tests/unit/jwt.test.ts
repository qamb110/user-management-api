import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshTokenExpiryDate,
} from '../../src/utils/jwt';
import { IUser } from '../../src/models/user.model';

// A minimal stand-in for a Mongoose User document — generateAccessToken/
// generateRefreshToken only ever read ._id and .role off it.
const fakeUser = (role: 'user' | 'admin' = 'user'): IUser =>
  ({ _id: new Types.ObjectId(), role }) as unknown as IUser;

describe('access tokens', () => {
  it('generates a token that verifies back to the same user id and role', () => {
    const user = fakeUser('admin');
    const token = generateAccessToken(user);
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe(user._id.toString());
    expect(payload.role).toBe('admin');
  });

  it('rejects a token signed with a different secret', () => {
    const tampered = jwt.sign({ sub: 'x', role: 'admin' }, 'not-the-real-secret');
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign({ sub: 'x', role: 'user' }, 'test-access-secret', {
      expiresIn: -10, // already expired 10 seconds ago
    });
    expect(() => verifyAccessToken(expired)).toThrow();
  });
});

describe('refresh tokens', () => {
  it('generates a token that verifies back to the same user id, with a jti', () => {
    const user = fakeUser();
    const { token, jti } = generateRefreshToken(user);
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe(user._id.toString());
    expect(payload.jti).toBe(jti);
  });

  it('gives every refresh token a unique jti', () => {
    const user = fakeUser();
    const first = generateRefreshToken(user);
    const second = generateRefreshToken(user);
    expect(first.jti).not.toBe(second.jti);
  });

  it('rejects a refresh token signed with the access secret (wrong secret)', () => {
    const wrongSecretToken = jwt.sign({ sub: 'x', jti: 'y' }, 'test-access-secret');
    expect(() => verifyRefreshToken(wrongSecretToken)).toThrow();
  });
});

describe('getRefreshTokenExpiryDate', () => {
  it('returns a date roughly REFRESH_TOKEN_EXPIRY (15d) in the future', () => {
    const expiry = getRefreshTokenExpiryDate();
    const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
    const diff = expiry.getTime() - Date.now();
    // Allow a small margin for however long the test itself takes to run.
    expect(diff).toBeGreaterThan(fifteenDaysMs - 5000);
    expect(diff).toBeLessThanOrEqual(fifteenDaysMs);
  });
});
