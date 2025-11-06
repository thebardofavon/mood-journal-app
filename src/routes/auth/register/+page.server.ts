import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { createSession, generateSessionToken, sessionCookieName } from '$lib/server/auth';
import { eq } from 'drizzle-orm';

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Username validation: alphanumeric, underscore, hyphen, 2-30 chars
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{2,30}$/;

export const load: PageServerLoad = async ({ locals }) => {
	// Redirect authenticated users away from register page
	if (locals.user) {
		throw redirect(303, '/journal');
	}
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		try {
			const form = await request.formData();
			const username = String(form.get('username') || '').trim();
			const email = String(form.get('email') || '')
				.toLowerCase()
				.trim();
			const password = String(form.get('password') || '');

			// Input validation with detailed error messages
			const errors: string[] = [];

			// Username validation
			if (!username) {
				errors.push('Username is required');
			} else if (username.length < 2) {
				errors.push('Username must be at least 2 characters');
			} else if (username.length > 30) {
				errors.push('Username must not exceed 30 characters');
			} else if (!USERNAME_REGEX.test(username)) {
				errors.push('Username can only contain letters, numbers, underscores, and hyphens');
			}

			// Email validation
			if (!email) {
				errors.push('Email is required');
			} else if (!EMAIL_REGEX.test(email)) {
				errors.push('Please enter a valid email address');
			} else if (email.length > 255) {
				errors.push('Email address is too long');
			}

			// Password validation
			if (!password) {
				errors.push('Password is required');
			} else if (password.length < 8) {
				errors.push('Password must be at least 8 characters');
			} else if (password.length > 128) {
				errors.push('Password must not exceed 128 characters');
			} else {
				// Check password strength
				const hasUpperCase = /[A-Z]/.test(password);
				const hasLowerCase = /[a-z]/.test(password);
				const hasNumber = /[0-9]/.test(password);
				const hasSpecial = /[^A-Za-z0-9]/.test(password);

				const strengthChecks = [hasUpperCase, hasLowerCase, hasNumber, hasSpecial].filter(
					Boolean
				).length;

				if (strengthChecks < 2) {
					errors.push(
						'Password should include a mix of uppercase, lowercase, numbers, and special characters'
					);
				}
			}

			if (errors.length > 0) {
				return fail(400, { message: errors.join('. ') + '.' });
			}

			// Check if user already exists
			let existing;
			try {
				[existing] = await db
					.select({ id: table.user.id, email: table.user.email })
					.from(table.user)
					.where(eq(table.user.email, email));
			} catch (dbError) {
				console.error('[register] Database error checking existing user:', dbError);
				return fail(503, { message: 'Service temporarily unavailable. Please try again.' });
			}

			if (existing) {
				return fail(400, { message: 'An account with this email already exists' });
			}

			// Hash password with argon2
			let passwordHash: string;
			try {
				const { hash } = await import('argon2');
				passwordHash = await hash(password, {
					type: 2, // argon2id
					memoryCost: 19456, // 19 MiB
					timeCost: 2,
					parallelism: 1
				});
			} catch (hashError) {
				console.error('[register] Password hashing error:', hashError);
				return fail(500, { message: 'Registration failed. Please try again.' });
			}

			const id = crypto.randomUUID();
			const now = new Date();

			// Insert new user
			try {
				await db.insert(table.user).values({
					id,
					username,
					email,
					passwordHash,
					createdAt: now,
					updatedAt: now,
					failedAttempts: 0,
					lockedUntil: new Date(0)
				});
			} catch (insertError) {
				console.error('[register] Database error creating user:', insertError);
				// Check if it's a constraint violation (race condition)
				if ((insertError as { code?: string })?.code?.includes('CONSTRAINT')) {
					return fail(400, { message: 'An account with this email already exists' });
				}
				return fail(500, { message: 'Registration failed. Please try again.' });
			}

			// Create session
			let session;
			try {
				const token = generateSessionToken();
				session = await createSession(token, id);
				cookies.set(sessionCookieName, token, {
					expires: session.expires,
					path: '/',
					httpOnly: true,
					secure: true,
					sameSite: 'lax'
				});
			} catch (sessionError) {
				console.error('[register] Session creation error:', sessionError);
				// User created but session failed - they can still log in
				return fail(500, {
					message: 'Account created but login failed. Please try logging in manually.'
				});
			}

			throw redirect(303, '/journal');
		} catch (error) {
			// Handle redirect separately
			if (error instanceof Response && error.status === 303) {
				throw error;
			}

			console.error('[register] Unexpected error:', error);
			return fail(500, { message: 'An unexpected error occurred. Please try again.' });
		}
	}
};
