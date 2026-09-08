import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { IUser } from '../models/user.model';

// We read the secrets/expiry from environment variables (see .env.example)
// instead of hardcoding them, so real secrets never end up in source control.
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

// Turns a duration string like "15d" or "15m" into seconds. jsonwebtoken's
// expiresIn option accepts a number of seconds, which keeps the typing
// simple and avoids relying on its string-parsing behaviour.
const UNIT_TO_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
};

const parseDurationToSeconds = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_TO_SECONDS[unit];
};

const ACCESS_EXPIRY_SECONDS = parseDurationToSeconds(process.env.ACCESS_TOKEN_EXPIRY || '15m');
const REFRESH_EXPIRY_SECONDS = parseDurationToSeconds(process.env.REFRESH_TOKEN_EXPIRY || '15d');

// What we store inside each token. Notice there's no password or other
// sensitive data in here — JWT payloads are just base64, not encrypted,
// so anyone holding the token can read them.
export interface AccessTokenPayload {
  sub: string; // the user's id
  role: 'user' | 'admin';
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string; // unique id for this specific refresh token, used to revoke it later
}

export const generateAccessToken = (user: IUser): string => {
  const payload: AccessTokenPayload = { sub: user._id.toString(), role: user.role };
  // Access tokens use their own secret and a short expiry, so a stolen
  // access token is only useful for a few minutes.
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY_SECONDS });
};

export const generateRefreshToken = (user: IUser): { token: string; jti: string } => {
  // A fresh random id for this token, so we can look it up / revoke it in
  // the database without needing to store the raw token itself.
  const jti = randomUUID();
  const payload: RefreshTokenPayload = { sub: user._id.toString(), jti };
  const token = jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY_SECONDS });
  return { token, jti };
};

export const getRefreshTokenExpiryDate = (): Date => {
  return new Date(Date.now() + REFRESH_EXPIRY_SECONDS * 1000);
};

// Throws if the token is missing, malformed, expired, or signed with the
// wrong secret — callers catch this and respond with 401.
export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
};
