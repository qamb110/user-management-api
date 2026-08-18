import { TodoStatus, ITodoStatus, STATUS_NAMES, StatusName } from '../models/todoStatus.model';

export const findAllStatuses = (): Promise<ITodoStatus[]> => {
  return TodoStatus.find();
};

// Accepts a plain string (e.g. straight from a validated request body)
// rather than the narrower StatusName type, since the caller may be passing
// through unvalidated input; we just won't find a match if it's not real.
export const findStatusByName = (name: string): Promise<ITodoStatus | null> => {
  return TodoStatus.findOne({ name: name as StatusName });
};

// Makes sure all 4 fixed status documents exist. Uses upsert so running
// this on every app startup is safe — it creates any that are missing and
// does nothing to ones that already exist (no duplicates).
export const seedDefaultStatuses = async (): Promise<void> => {
  await Promise.all(
    STATUS_NAMES.map((name) =>
      TodoStatus.findOneAndUpdate({ name }, { name }, { upsert: true, new: true }),
    ),
  );
};
