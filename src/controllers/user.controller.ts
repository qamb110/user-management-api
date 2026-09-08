import { Request, Response } from 'express';
import * as userService from '../services/user.service';
import { logger } from '../utils/logger';

// Controllers only handle the HTTP side of things: reading the request,
// calling the service layer to do the real work, and sending back a
// response. They should not contain business logic or database queries.

// Mongo throws an error with code 11000 when a unique field (username/email)
// already exists. We turn that into a friendly 409 Conflict instead of a
// raw database error leaking to the client.
const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;

const handleError = (res: Response, error: unknown): void => {
  if (error instanceof userService.ServiceError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  if (isDuplicateKeyError(error)) {
    res.status(409).json({ message: 'Username or email is already in use' });
    return;
  }

  logger.error('Unhandled error in user controller', { error });
  res.status(500).json({ message: 'Something went wrong' });
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    handleError(res, error);
  }
};

export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    handleError(res, error);
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json(user);
  } catch (error) {
    handleError(res, error);
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.status(200).json(user);
  } catch (error) {
    handleError(res, error);
  }
};

export const softDeleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await userService.softDeleteUser(req.params.id);
    res.status(200).json(user);
  } catch (error) {
    handleError(res, error);
  }
};
