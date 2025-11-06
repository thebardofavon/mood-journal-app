/**
 * Common validation utilities for server-side input validation
 */
import * as v from 'valibot';

// Email validation regex (RFC 5322 simplified)
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Username validation: alphanumeric, underscore, hyphen, 2-30 chars
export const USERNAME_REGEX = /^[a-zA-Z0-9_-]{2,30}$/;

// Common validation schemas
export const EmailSchema = v.pipe(
	v.string(),
	v.trim(),
	v.toLowerCase(),
	v.email('Invalid email address'),
	v.maxLength(255, 'Email is too long')
);

export const UsernameSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(2, 'Username must be at least 2 characters'),
	v.maxLength(30, 'Username must not exceed 30 characters'),
	v.regex(USERNAME_REGEX, 'Username can only contain letters, numbers, underscores, and hyphens')
);

export const PasswordSchema = v.pipe(
	v.string(),
	v.minLength(8, 'Password must be at least 8 characters'),
	v.maxLength(128, 'Password is too long')
);

export const MoodSchema = v.picklist(['happy', 'neutral', 'sad', 'anxious'], 'Invalid mood value');

export const ContentSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(1, 'Content cannot be empty'),
	v.maxLength(10000, 'Content is too long (max 10,000 characters)')
);

export const UUIDSchema = v.pipe(v.string(), v.uuid('Invalid ID format'));

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
export function sanitizeString(input: string): string {
	return input
		.trim()
		.replace(/[<>]/g, '') // Remove angle brackets
		.slice(0, 1000); // Limit length
}

/**
 * Validate and sanitize user input with detailed error messages
 */
export function validateInput<T>(
	schema: v.BaseSchema<unknown, T, v.BaseIssue<unknown>>,
	data: unknown
): { success: true; data: T } | { success: false; error: string } {
	const result = v.safeParse(schema, data);

	if (result.success) {
		return { success: true, data: result.output };
	}

	const errors = result.issues.map((issue) => issue.message);
	return { success: false, error: errors.join('. ') };
}

/**
 * Check password strength
 */
export function checkPasswordStrength(password: string): {
	isStrong: boolean;
	message?: string;
} {
	const hasUpperCase = /[A-Z]/.test(password);
	const hasLowerCase = /[a-z]/.test(password);
	const hasNumber = /[0-9]/.test(password);
	const hasSpecial = /[^A-Za-z0-9]/.test(password);

	const checks = [hasUpperCase, hasLowerCase, hasNumber, hasSpecial].filter(Boolean).length;

	if (checks < 2) {
		return {
			isStrong: false,
			message:
				'Password should include a mix of uppercase, lowercase, numbers, and special characters'
		};
	}

	return { isStrong: true };
}
