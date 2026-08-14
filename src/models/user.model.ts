import mongoose, { Document, Schema } from 'mongoose';

// This interface describes the shape of a User document in TypeScript,
// so the rest of the app gets type-checking and autocomplete when using it.
export interface IUser extends Document {
  username: string;
  email: string;
  role: 'user' | 'admin';
  password: string;
  isDeleted: boolean;
  profilePicture?: string;
}

// A Mongoose "Schema" defines the fields a document in the collection will
// have, along with validation rules for each field.
const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true, // every user must have a username
      unique: true, // no two users can share the same username
      trim: true, // removes accidental extra spaces, e.g. " john "
    },
    email: {
      type: String,
      required: true,
      unique: true, // no two users can share the same email
      trim: true,
      lowercase: true, // store emails in lowercase to avoid duplicates like "A@x.com" and "a@x.com"
    },
    role: {
      type: String,
      // enum restricts the value to only these options, so bad data like role: "boss" is rejected
      enum: ['user', 'admin'],
      default: 'user', // most accounts are regular users unless set otherwise
    },
    password: {
      type: String,
      required: true,
      // The value stored here is always a bcrypt hash, never the plain
      // password. Hashing happens in the service layer (see
      // src/utils/password.ts) before a document reaches this model.
    },
    isDeleted: {
      type: Boolean,
      default: false,
      // We "soft delete" users: instead of removing the document from
      // MongoDB, we just flag it. This keeps the data (useful for audit /
      // history) while letting the API hide it from normal reads.
    },
    profilePicture: {
      type: String,
      // Not required — a user may not have uploaded a picture yet. This
      // stores a URL (e.g. "/uploads/<file>") pointing at the image saved
      // by POST /upload, not the image data itself.
    },
  },
  {
    // timestamps automatically adds and manages createdAt / updatedAt fields
    timestamps: true,
  },
);

// The model is what we actually use in the rest of the app to read/write
// documents. Mongoose will store these in a collection named "users"
// (it automatically lowercases and pluralizes the "User" model name).
export const User = mongoose.model<IUser>('User', userSchema);
