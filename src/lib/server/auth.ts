import type { RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase64url, encodeHexLowerCase } from '@oslojs/encoding';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export const sessionCookieName = 'auth-session';

export function generateSessionToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(18));
	const token = encodeBase64url(bytes);
	return token;
}

export async function createSession(token: string, userId: string) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session: table.Session = {
		sessionToken: sessionId,
		userId,
		expires: new Date(Date.now() + DAY_IN_MS * 30)
	};
	await db.insert(table.session).values(session);
	return session;
}

export async function validateSessionToken(token: string) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const [result] = await db
		.select({
			// Keep selection compatible with older DBs without avatar_url
			user: {
				id: table.user.id,
				username: table.user.username,
				email: table.user.email,
				avatarUrl: table.user.avatarUrl
			},
			session: table.session
		})
		.from(table.session)
		.innerJoin(table.user, eq(table.session.userId, table.user.id))
		.where(eq(table.session.sessionToken, sessionId));

	if (!result) {
		return { session: null, user: null };
	}
	const { session, user } = result;

	const sessionExpired = Date.now() >= session.expires.getTime();
	if (sessionExpired) {
		await db.delete(table.session).where(eq(table.session.sessionToken, session.sessionToken));
		return { session: null, user: null };
	}

	const renewSession = Date.now() >= session.expires.getTime() - DAY_IN_MS * 15;
	if (renewSession) {
		session.expires = new Date(Date.now() + DAY_IN_MS * 30);
		await db
			.update(table.session)
			.set({ expires: session.expires })
			.where(eq(table.session.sessionToken, session.sessionToken));
	}

	return { session, user };
}

export type SessionValidationResult = Awaited<ReturnType<typeof validateSessionToken>>;

export async function invalidateSession(sessionId: string) {
	await db.delete(table.session).where(eq(table.session.sessionToken, sessionId));
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date) {
	event.cookies.set(sessionCookieName, token, {
		expires: expiresAt,
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax'
	});
}

export function deleteSessionTokenCookie(event: RequestEvent) {
	event.cookies.delete(sessionCookieName, {
		path: '/'
	});
}

export async function registerUser(username: string, email: string, passwordHash: string) {
	const id = crypto.randomUUID();
	const now = new Date();
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
	return id;
}

export async function verifyCredentials(email: string, passwordHash: string) {
	const { eq } = await import('drizzle-orm');
	const [row] = await db
		.select({
			id: table.user.id,
			username: table.user.username,
			email: table.user.email,
			passwordHash: table.user.passwordHash,
			failedAttempts: table.user.failedAttempts,
			lockedUntil: table.user.lockedUntil
		})
		.from(table.user)
		.where(eq(table.user.email, email));
	if (!row) return null;
	const { verify } = await import('argon2');
	const ok = await verify(row.passwordHash, passwordHash);
	if (!ok) return null;
	return row;
}
