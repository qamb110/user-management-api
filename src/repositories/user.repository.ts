import { User, IUser } from '../models/user.model';

// The Repository Layer is the ONLY place in the app allowed to talk to the
// Mongoose model directly. Controllers/services call these functions instead
// of importing `User` themselves. This keeps database query details in one
// place, so if we ever change how we query Mongo, we only change this file.

export interface CreateUserInput {
  username: string;
  email: string;
  role?: 'user' | 'admin';
  password: string; // already hashed by the time it reaches here
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
  role?: 'user' | 'admin';
  password?: string; // already hashed by the time it reaches here
  profilePicture?: string;
}

export const createUser = (data: CreateUserInput): Promise<IUser> => {
  return User.create(data);
};

// Only returns users that are NOT soft-deleted, so deleted accounts never
// show up in a normal listing.
export const findAllActiveUsers = (): Promise<IUser[]> => {
  return User.find({ isDeleted: false });
};

// Looks up a single active (not soft-deleted) user by id.
export const findActiveUserById = (id: string): Promise<IUser | null> => {
  return User.findOne({ _id: id, isDeleted: false });
};

// Used at login time, where we identify the user by username rather than id.
export const findActiveUserByUsername = (username: string): Promise<IUser | null> => {
  return User.findOne({ username, isDeleted: false });
};

export const updateUserById = (id: string, data: UpdateUserInput): Promise<IUser | null> => {
  // { new: true } makes Mongoose return the document AFTER the update,
  // instead of the old version before the change.
  return User.findOneAndUpdate({ _id: id, isDeleted: false }, data, { new: true });
};

// "Soft" delete: we flip the isDeleted flag instead of removing the
// document, so the data isn't lost and can be audited/restored later.
export const softDeleteUserById = (id: string): Promise<IUser | null> => {
  return User.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true });
};
