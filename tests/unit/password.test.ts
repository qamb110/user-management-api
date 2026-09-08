import { isPasswordStrong, hashPassword, comparePassword } from '../../src/utils/password';

describe('isPasswordStrong', () => {
  it('accepts a password with upper, lower, number, symbol, and 8+ chars', () => {
    expect(isPasswordStrong('Str0ng!Pass')).toBe(true);
  });

  it('rejects a password missing an uppercase letter', () => {
    expect(isPasswordStrong('str0ng!pass')).toBe(false);
  });

  it('rejects a password missing a lowercase letter', () => {
    expect(isPasswordStrong('STR0NG!PASS')).toBe(false);
  });

  it('rejects a password missing a number', () => {
    expect(isPasswordStrong('Strong!Pass')).toBe(false);
  });

  it('rejects a password missing a symbol', () => {
    expect(isPasswordStrong('Str0ngPass')).toBe(false);
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(isPasswordStrong('S1!aaa')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isPasswordStrong('')).toBe(false);
  });
});

describe('hashPassword / comparePassword', () => {
  it('hashes a password and can later verify it matches', async () => {
    const hash = await hashPassword('Str0ng!Pass');
    expect(hash).not.toBe('Str0ng!Pass');
    await expect(comparePassword('Str0ng!Pass', hash)).resolves.toBe(true);
  });

  it('rejects the wrong password against a real hash', async () => {
    const hash = await hashPassword('Str0ng!Pass');
    await expect(comparePassword('WrongPass1!', hash)).resolves.toBe(false);
  });
});
