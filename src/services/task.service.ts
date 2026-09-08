import * as taskRepository from '../repositories/task.repository';
import * as todoStatusRepository from '../repositories/todoStatus.repository';
import * as userRepository from '../repositories/user.repository';
import { ServiceError } from './user.service';
import { AccessTokenPayload } from '../utils/jwt';
import { IUser } from '../models/user.model';
import { logger } from '../utils/logger';

const DEFAULT_STATUS_NAME = 'Backlog';

export interface CreateTaskPayload {
  title: string;
  description?: string;
  assigned_to: string;
  status?: string; // status name, e.g. "Todo" — optional, defaults to Backlog
}

export const createTask = async (payload: CreateTaskPayload) => {
  const { title, description, assigned_to, status } = payload;

  // assigned_to must point at a real, active user — otherwise we'd create a
  // task nobody can ever see on their board.
  const assignee = await userRepository.findActiveUserById(assigned_to);
  if (!assignee) {
    throw new ServiceError('assigned_to must be an existing user', 400);
  }

  const statusName = status || DEFAULT_STATUS_NAME;
  const statusDoc = await todoStatusRepository.findStatusByName(statusName);
  if (!statusDoc) {
    // Shouldn't normally happen since express-validator restricts `status`
    // to the known names, but the DB is the source of truth here.
    throw new ServiceError(`Unknown status: ${statusName}`, 400);
  }

  const task = await taskRepository.createTask({
    title,
    description,
    assigned_to,
    status: statusDoc._id.toString(),
  });

  logger.info('Task created and assigned', {
    taskId: task._id.toString(),
    assignedTo: assigned_to,
    status: statusDoc.name,
  });

  return task;
};

// Admins see the whole board; everyone else only sees tasks assigned to them.
export const getTasks = async (requestingUser: AccessTokenPayload) => {
  if (requestingUser.role === 'admin') {
    return taskRepository.findAllTasks();
  }
  return taskRepository.findTasksAssignedTo(requestingUser.sub);
};

export const updateTaskStatus = async (
  taskId: string,
  newStatusName: string,
  requestingUser: AccessTokenPayload,
) => {
  const task = await taskRepository.findTaskById(taskId);
  if (!task) {
    throw new ServiceError('Task not found', 404);
  }

  // task.assigned_to is populated (see task.repository.ts), so at runtime
  // it's really a full User document, not just an id — the type just
  // doesn't reflect that, so we cast it here to read its _id.
  const assignedToUser = task.assigned_to as unknown as IUser;

  // Only the person the task is assigned to, or an admin, may move it.
  const isOwner = assignedToUser._id.toString() === requestingUser.sub;
  const isAdmin = requestingUser.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw new ServiceError('You are not allowed to update this task', 403);
  }

  const statusDoc = await todoStatusRepository.findStatusByName(newStatusName);
  if (!statusDoc) {
    throw new ServiceError(`Unknown status: ${newStatusName}`, 400);
  }

  const updatedTask = await taskRepository.updateTaskStatus(taskId, statusDoc._id.toString());

  logger.info('Task status updated', {
    taskId,
    newStatus: statusDoc.name,
    updatedBy: requestingUser.sub,
  });

  return updatedTask;
};
