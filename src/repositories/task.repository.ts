import { Task, ITask } from '../models/task.model';

export interface CreateTaskInput {
  title: string;
  description?: string;
  status: string; // TodoStatus document id
  assigned_to: string; // User document id
}

// Every task we return to the API gets its status/assigned_to ids replaced
// with the actual documents they point to (status name, username, etc.)
// instead of raw ObjectIds, so responses are readable.
const withPopulatedRefs = (task: ITask) =>
  task.populate([{ path: 'status' }, { path: 'assigned_to', select: 'username email role' }]);

export const createTask = async (data: CreateTaskInput): Promise<ITask> => {
  const task = await Task.create(data);
  return withPopulatedRefs(task);
};

export const findAllTasks = async (): Promise<ITask[]> => {
  const tasks = await Task.find();
  return Task.populate(tasks, [
    { path: 'status' },
    { path: 'assigned_to', select: 'username email role' },
  ]);
};

export const findTasksAssignedTo = async (userId: string): Promise<ITask[]> => {
  const tasks = await Task.find({ assigned_to: userId });
  return Task.populate(tasks, [
    { path: 'status' },
    { path: 'assigned_to', select: 'username email role' },
  ]);
};

export const findTaskById = async (id: string): Promise<ITask | null> => {
  const task = await Task.findById(id);
  return task ? withPopulatedRefs(task) : null;
};

export const updateTaskStatus = async (id: string, statusId: string): Promise<ITask | null> => {
  const task = await Task.findByIdAndUpdate(id, { status: statusId }, { new: true });
  return task ? withPopulatedRefs(task) : null;
};
