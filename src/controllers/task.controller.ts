import { Request, Response } from 'express';
import * as taskService from '../services/task.service';
import { ServiceError } from '../services/user.service';
import { logger } from '../utils/logger';

const handleError = (res: Response, error: unknown): void => {
  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  logger.error('Unhandled error in task controller', { error });
  res.status(500).json({ message: 'Something went wrong' });
};

export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await taskService.createTask(req.body);
    res.status(201).json(task);
  } catch (error) {
    handleError(res, error);
  }
};

export const getTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const tasks = await taskService.getTasks(req.user!);
    res.status(200).json(tasks);
  } catch (error) {
    handleError(res, error);
  }
};

export const updateTaskStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await taskService.updateTaskStatus(req.params.id, req.body.status, req.user!);
    res.status(200).json(task);
  } catch (error) {
    handleError(res, error);
  }
};
