import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../utils/jwt';

// Express doesn't know about our custom `user` property by default, so we
// extend its Request type here. This gives us type-checking/autocomplete
// wherever we read `req.user` after this middleware has run.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

// Protects a route: the request must include a valid, unexpired access
// token in the "Authorization: Bearer <token>" header. On success, the
// decoded token (user id + role) is attached to req.user so later
// middleware/controllers know who is making the request.
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.header('authorization');

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Access token is missing' });
    return;
  }

  const token = header.slice('Bearer '.length);

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    // jwt.verify throws for a bad signature, malformed token, or an
    // expired one — from the client's point of view, they're all "not
    // authenticated", so we respond the same way for all of them.
    res.status(401).json({ message: 'Access token is invalid or expired' });
  }
};

// Runs AFTER authenticate(), so req.user is already set. Restricts a route
// to admins only — used to replace the old placeholder x-user-role header
// check now that we have real, verified identity from the JWT.
export const requireAdminRole = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ message: 'Only admins are allowed to perform this action' });
    return;
  }

  next();
};
