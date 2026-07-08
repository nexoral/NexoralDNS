import { describe, it, expect } from 'vitest';
import { validatePasswordStrength } from '@server/source/helper/passwordPolicy.helper';

describe('validatePasswordStrength', () => {
  it('accepts a password meeting every rule', () => {
    expect(validatePasswordStrength('Abcdef1g')).toEqual({ valid: true });
  });

  it('rejects a non-string input', () => {
    const result = validatePasswordStrength(undefined as unknown as string);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/at least 8 characters/);
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = validatePasswordStrength('Ab1cde'); // 6 chars
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/at least 8 characters/);
  });

  it('rejects a password missing a lowercase letter', () => {
    const result = validatePasswordStrength('ABCDEF1G');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/uppercase and lowercase/);
  });

  it('rejects a password missing an uppercase letter', () => {
    const result = validatePasswordStrength('abcdef1g');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/uppercase and lowercase/);
  });

  it('rejects a password missing a digit', () => {
    const result = validatePasswordStrength('Abcdefgh');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/at least one digit/);
  });

  it('accepts exactly the 8-character minimum when all rules pass', () => {
    expect(validatePasswordStrength('Abcdefg1')).toEqual({ valid: true });
  });
});
