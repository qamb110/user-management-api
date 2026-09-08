import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { ServiceError } from '../services/user.service';
import { logger } from '../utils/logger';

const handleError = (res: Response, error: unknown): void => {
  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  logger.error('Unhandled error in auth controller', { error });
  res.status(500).json({ message: 'Something went wrong' });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;
    const result = await authService.refreshToken(token);
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};
