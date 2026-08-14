import bcrypt from 'bcrypt';

// This regex enforces the password rule the task asks for:
// - (?=.*[a-z])  at least one lowercase letter
// - (?=.*[A-Z])  at least one uppercase letter
// - (?=.*\d)     at least one number
// - (?=.*[^\w\s]) at least one symbol (anything that's not a letter/number/space)
// - .{8,}        at least 8 characters long
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

// We keep the rule in one place so both the check and the error message
// shown to the user always stay in sync.
export const isPasswordStrong = (password: string): boolean => PASSWORD_RULE.test(password);

export const PASSWORD_RULE_MESSAGE =
  'Password must be at least 8 characters long and include an uppercase letter, ' +
  'a lowercase letter, a number, and a symbol.';

// Number of salt rounds bcrypt uses when hashing. Higher = slower but more
// secure against brute force. 10 is the commonly recommended default.
const SALT_ROUNDS = 10;

// We never store a plain password. This turns it into a one-way hash before
// it gets saved to the database.
export const hashPassword = async (plainPassword: string): Promise<string> => {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

// Used during login: bcrypt can't "decrypt" the stored hash, but it can
// re-hash the plain password the user typed and check it matches.
export const comparePassword = async (
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hashedPassword);
};
