import mongoose, { Document, Schema } from 'mongoose';

// The 4 fixed stages a task can be in. These aren't created by users through
// the API — they're seeded once when the app starts (see
// src/repositories/todoStatus.repository.ts + src/config/database.ts) so
// they always exist for tasks to reference.
export const STATUS_NAMES = ['Backlog', 'Todo', 'InProgress', 'Completed'] as const;
export type StatusName = (typeof STATUS_NAMES)[number];

export interface ITodoStatus extends Document {
  name: StatusName;
}

const todoStatusSchema = new Schema<ITodoStatus>({
  name: {
    type: String,
    enum: STATUS_NAMES,
    required: true,
    unique: true,
  },
});

// Stored in a collection named "todo" (per the task spec), even though the
// model is called TodoStatus — mongoose would otherwise name the collection
// "todostatuses", so we set it explicitly.
export const TodoStatus = mongoose.model<ITodoStatus>('TodoStatus', todoStatusSchema, 'todo');
