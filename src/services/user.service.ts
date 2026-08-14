import * as userRepository from '../repositories/user.repository';
import { IUser } from '../models/user.model';
import { hashPassword } from '../utils/password';

// The Service Layer holds business rules (password hashing, deciding what
// counts as "not found", etc). Field-level validation (required fields,
// email format, password strength, valid mongo id, ...) already happened in
// the route's express-validator chains before a request gets here — see
// src/validators/user.validator.ts — so this layer can trust its input
// shape and focus on what only it knows how to do.

// A small custom error so the controller can tell "not found" (404) apart
// from other failures without checking string messages.
export class ServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Removes the password field before sending a user back in an API response.
// We never want a password hash (even a hashed one) leaving the server.
// Exported so auth.service.ts can reuse it for the /login response too.
export const toSafeUser = (user: IUser) => {
  const { password: _password, ...safeUser } = user.toObject();
  return safeUser;
};

export interface CreateUserPayload {
  username: string;
  email: string;
  role?: 'user' | 'admin';
  password: string;
}

export const createUser = async (payload: CreateUserPayload) => {
  const { username, email, role, password } = payload;

  const hashedPassword = await hashPassword(password);

  const user = await userRepository.createUser({
    username,
    email,
    role,
    password: hashedPassword,
  });

  return toSafeUser(user);
};

export const getAllUsers = async () => {
  const users = await userRepository.findAllActiveUsers();
  return users.map(toSafeUser);
};

export const getUserById = async (id: string) => {
  const user = await userRepository.findActiveUserById(id);

  if (!user) {
    throw new ServiceError('User not found', 404);
  }

  return toSafeUser(user);
};

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  role?: 'user' | 'admin';
  password?: string;
}

export const updateUser = async (id: string, payload: UpdateUserPayload) => {
  const { username, email, role, password } = payload;

  const updateData: userRepository.UpdateUserInput = {};
  if (username) updateData.username = username;
  if (email) updateData.email = email;
  if (role) updateData.role = role;
  if (password) updateData.password = await hashPassword(password);

  const updatedUser = await userRepository.updateUserById(id, updateData);

  if (!updatedUser) {
    throw new ServiceError('User not found', 404);
  }

  return toSafeUser(updatedUser);
};

export const softDeleteUser = async (id: string) => {
  const deletedUser = await userRepository.softDeleteUserById(id);

  if (!deletedUser) {
    throw new ServiceError('User not found', 404);
  }

  return toSafeUser(deletedUser);
};
