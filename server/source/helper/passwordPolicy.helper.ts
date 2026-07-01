export interface PasswordStrengthResult {
  valid: boolean;
  message?: string;
}

const MIN_LENGTH = 8;

/**
 * Enforces a single, shared password strength policy across every code path
 * that sets a password (user creation, admin password reset, self-service
 * change password) so the rule can never drift out of sync between them.
 */
export const validatePasswordStrength = (password: string): PasswordStrengthResult => {
  if (typeof password !== "string" || password.length < MIN_LENGTH) {
    return { valid: false, message: `Password must be at least ${MIN_LENGTH} characters long` };
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain both uppercase and lowercase letters" };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: "Password must contain at least one digit" };
  }
  return { valid: true };
};
