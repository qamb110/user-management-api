import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

// We centralize the "did validation fail?" check here instead of repeating
// it inside every controller. Routes attach express-validator rules (see
// src/validators/), and this middleware runs after them to actually stop
// the request if any rule failed.
export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // .array() gives us one entry per failed rule; we just send their
    // messages back so the client knows exactly what to fix.
    res.status(400).json({ errors: errors.array().map((e) => e.msg) });
    return;
  }

  next();
};
