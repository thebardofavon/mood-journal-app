import type { Handle, HandleServerError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import * as auth from '$lib/server/auth';
import { json } from '@sveltejs/kit';

const handleAuth: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(auth.sessionCookieName);

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await auth.validateSessionToken(sessionToken);

	if (session) {
		auth.setSessionTokenCookie(event, sessionToken, session.expires);
	} else {
		auth.deleteSessionTokenCookie(event);
	}

	event.locals.user = user;
	event.locals.session = session;
	return resolve(event);
};

// Request validation middleware
const handleRequestValidation: Handle = async ({ event, resolve }) => {
	// Content-Length validation (prevent extremely large requests)
	const contentLength = event.request.headers.get('content-length');
	if (contentLength) {
		const size = parseInt(contentLength, 10);
		const maxSize = 20 * 1024 * 1024; // 20MB max request size

		if (size > maxSize) {
			console.warn('[security] Request too large:', {
				path: event.url.pathname,
				size,
				maxSize
			});
			return json({ error: 'Request body too large' }, { status: 413 });
		}
	}

	// Content-Type validation for POST/PUT/PATCH
	if (['POST', 'PUT', 'PATCH'].includes(event.request.method)) {
		const contentType = event.request.headers.get('content-type');
		const path = event.url.pathname;

		// Skip validation for file uploads
		if (!path.includes('/upload')) {
			if (!contentType) {
				console.warn('[security] Missing content-type:', path);
			} else {
				// Ensure content-type is from allowed list
				const allowed = [
					'application/json',
					'application/x-www-form-urlencoded',
					'multipart/form-data',
					'text/plain'
				];
				const matches = allowed.some((type) => contentType.includes(type));

				if (!matches) {
					console.warn('[security] Suspicious content-type:', {
						path,
						contentType
					});
				}
			}
		}
	}

	return resolve(event);
};

const withSecurityHeaders: Handle = async ({ event, resolve }) => {
	// Run downstream handlers first (auth, routes)
	const response = await resolve(event);

	// Set security headers (stricter in production)
	const isProd = process.env.NODE_ENV === 'production';
	const cspBase = [
		"default-src 'self'",
		"img-src 'self' data: blob:",
		"media-src 'self' blob:",
		"font-src 'self' data:",
		"connect-src 'self'",
		// Allow dev HMR/websocket and local Ollama during development
		!isProd ? "connect-src 'self' ws: http://localhost:11434" : null,
		// Tailwind inline styles are safe; keep inline styles allowed
		"style-src 'self' 'unsafe-inline'",
		"script-src 'self'"
	]
		.filter(Boolean)
		.join('; ');

	// Use Report-Only in dev to avoid breaking local tooling
	if (!isProd) {
		response.headers.set('Content-Security-Policy-Report-Only', cspBase);
	} else {
		response.headers.set('Content-Security-Policy', cspBase);
	}

	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'no-referrer');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

	// Only set HSTS when using HTTPS
	try {
		const url = new URL(event.url);
		if (url.protocol === 'https:') {
			response.headers.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
		}
	} catch {
		// ignore
	}

	return response;
};

export const handle: Handle = sequence(handleAuth, handleRequestValidation, withSecurityHeaders);

export const handleError: HandleServerError = ({ error, event }) => {
	const requestId = crypto.randomUUID();

	// Determine if error should be logged (avoid spam from expected errors)
	const isExpectedError =
		error instanceof Error &&
		(error.message.includes('redirect') || error.message.includes('Not found'));

	if (!isExpectedError) {
		// Minimal structured logging without PII
		console.error(
			JSON.stringify({
				level: 'error',
				msg: 'Unhandled error',
				requestId,
				path: event.url.pathname,
				method: event.request.method,
				name: (error as Error).name,
				message: (error as Error).message,
				stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
			})
		);
	}

	// Return user-friendly error message
	return {
		message: 'An unexpected error occurred',
		code: requestId
	};
};
