import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeHexLowerCase } from '@oslojs/encoding';
import { createSession, generateSessionToken, sessionCookieName } from '$lib/server/auth';
import { allow, reset } from '$lib/server/rateLimit';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	// Redirect authenticated users away from login page
	if (locals.user) {
		throw redirect(303, '/journal');
	}
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const startTime = Date.now();

		try {
			const form = await request.formData();
			const email = String(form.get('email') || '')
				.toLowerCase()
				.trim();
			const password = String(form.get('password') || '');

			// Get client IP for rate limiting
			const ip = getClientAddress();

			// Check rate limit
			const allowed = await allow(ip, 10, 60_000); // Stricter: 10 attempts per minute
			if (!allowed) {
				return fail(429, {
					message: 'Too many login attempts. Please wait a moment before trying again.'
				});
			}

			// Input validation
			if (!email || !password) {
				// Constant-time delay to prevent timing attacks
				await new Promise((resolve) =>
					setTimeout(resolve, Math.max(0, 100 - (Date.now() - startTime)))
				);
				return fail(400, { message: 'Please provide both email and password' });
			}

			// Email format validation
			if (!email.includes('@') || email.length < 3) {
				await new Promise((resolve) =>
					setTimeout(resolve, Math.max(0, 100 - (Date.now() - startTime)))
				);
				return fail(400, { message: 'Invalid email format' });
			}

			// Query user - wrap in try-catch for database errors
			let row;
			try {
				[row] = await db
					.select({
						id: table.user.id,
						password_hash: table.user.passwordHash,
						failed_attempts: table.user.failedAttempts,
						locked_until: table.user.lockedUntil
					})
					.from(table.user)
					.where(eq(table.user.email, email));
			} catch (dbError) {
				console.error('[auth] Database error during user lookup:', dbError);
				// Constant-time delay
				await new Promise((resolve) =>
					setTimeout(resolve, Math.max(0, 100 - (Date.now() - startTime)))
				);
				return fail(503, { message: 'Service temporarily unavailable. Please try again.' });
			}

			if (!row) {
				// User doesn't exist - use constant-time delay to prevent user enumeration
				await new Promise((resolve) =>
					setTimeout(resolve, Math.max(0, 100 - (Date.now() - startTime)))
				);
				return fail(400, { message: 'Invalid email or password' });
			}

			// Check account lockout
			const rawLocked = row.locked_until;
			let lockedUntil: number;
			if (rawLocked instanceof Date) {
				lockedUntil = rawLocked.getTime();
			} else if (typeof rawLocked === 'number') {
				lockedUntil = rawLocked > 1e12 ? rawLocked : rawLocked * 1000;
			} else {
				lockedUntil = new Date(String(rawLocked)).getTime();
			}

			if (lockedUntil > Date.now()) {
				const remainingMinutes = Math.ceil((lockedUntil - Date.now()) / 60000);
				return fail(403, {
					message: `Account locked. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`
				});
			}

			// Verify password
			const { verify } = await import('argon2');
			let passwordValid = false;
			try {
				passwordValid = await verify(row.password_hash, password);
			} catch (verifyError) {
				console.error('[auth] Password verification error:', verifyError);
				return fail(500, { message: 'Authentication error. Please try again.' });
			}

			if (!passwordValid) {
				// Increment failed attempts
				const attempts = (row.failed_attempts || 0) + 1;
				const updates: { failedAttempts: number; lockedUntil?: Date } = {
					failedAttempts: attempts
				};

				const LOCK_THRESHOLD = 5;
				const LOCK_MINUTES = 15;

				if (attempts >= LOCK_THRESHOLD) {
					updates.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
				}

				try {
					await db.update(table.user).set(updates).where(eq(table.user.id, row.id));
				} catch (updateError) {
					console.error('[auth] Error updating failed attempts:', updateError);
				}

				// Constant-time delay
				await new Promise((resolve) =>
					setTimeout(resolve, Math.max(0, 100 - (Date.now() - startTime)))
				);

				const remainingAttempts = LOCK_THRESHOLD - attempts;
				if (remainingAttempts > 0) {
					return fail(400, {
						message: `Invalid email or password. ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.`
					});
				} else {
					return fail(403, {
						message: `Account locked for ${LOCK_MINUTES} minutes due to too many failed attempts.`
					});
				}
			}

			// Successful login - reset failed attempts and create session atomically
			const expiresAtMs = Date.now() + 1000 * 60 * 60 * 24 * 30;
			let finalToken: string | null = null;

			try {
				db.transaction((tx) => {
					// Reset failed attempts
					tx.update(table.user)
						.set({ failedAttempts: 0, lockedUntil: new Date(0) })
						.where(eq(table.user.id, row.id))
						.run();

					// Create session with retry logic
					let tries = 0;
					while (tries < 5) {
						tries += 1;
						const token = generateSessionToken();
						const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
						try {
							tx.insert(table.session)
								.values({
									sessionToken: sessionId,
									userId: row.id,
									expires: new Date(expiresAtMs)
								})
								.run();
							finalToken = token;
							break;
						} catch (e: unknown) {
							if ((e as { code?: string })?.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' && tries < 5) {
								continue;
							}
							throw e;
						}
					}
				});

				if (finalToken) {
					// Set secure cookie
					cookies.set(sessionCookieName, finalToken, {
						expires: new Date(expiresAtMs),
						path: '/',
						httpOnly: true,
						secure: process.env.NODE_ENV === 'production',
						sameSite: 'lax'
					});
				} else {
					throw new Error('Failed to create session');
				}
			} catch (err) {
				console.error('[auth] Transaction error:', err);
				// Fallback session creation
				try {
					const fbToken = generateSessionToken();
					const session = await createSession(fbToken, row.id);
					cookies.set(sessionCookieName, fbToken, {
						expires: session.expires,
						path: '/',
						httpOnly: true,
						secure: process.env.NODE_ENV === 'production',
						sameSite: 'lax'
					});
				} catch (fallbackError) {
					console.error('[auth] Fallback session creation failed:', fallbackError);
					return fail(500, {
						message: 'Login successful but session creation failed. Please try again.'
					});
				}
			}

			// Reset rate limit on successful login
			await reset(ip);

			throw redirect(303, '/journal');
		} catch (error) {
			// Handle redirect separately (it's expected)
			if (error instanceof Response && error.status === 303) {
				throw error;
			}

			console.error('[auth] Unexpected error in login:', error);
			return fail(500, { message: 'An unexpected error occurred. Please try again.' });
		}
	}
};
