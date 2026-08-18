import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description?: string;
  status: Types.ObjectId; // references a document in the "todo" collection
  assigned_to: Types.ObjectId; // references a document in the "users" collection
}

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      // "ref" tells mongoose which model this id points to, so we can
      // later .populate('status') to get the full status document instead
      // of just its id.
      type: Schema.Types.ObjectId,
      ref: 'TodoStatus',
      required: true,
    },
    assigned_to: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Stored in a collection named "tasks" (mongoose would default to this
// anyway for a model called "Task", but we name it explicitly to match the spec).
export const Task = mongoose.model<ITask>('Task', taskSchema, 'tasks');
