import { env } from './env';

// Simple in-memory fallback with metadata
interface RateLimitEntry {
	count: number;
	expiresAt: number;
	resetAt: number;
}

const ipMap = new Map<string, RateLimitEntry>();

let redisClient: {
	incr: (key: string) => Promise<number>;
	expire: (key: string, ttl: number) => Promise<number>;
	del: (key: string) => Promise<number>;
	ttl: (key: string) => Promise<number>;
} | null = null;

try {
	if (env.REDIS_URL) {
		// lazily require to avoid adding a hard dependency for dev users
		// ioredis has wide compatibility
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const IORedis = require('ioredis');
		redisClient = new IORedis(env.REDIS_URL);
	}
} catch {
	// if redis isn't installed or connection fails, we'll fall back to in-memory
	redisClient = null;
}

interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetAt: number;
	retryAfter?: number;
}

async function checkRedis(ip: string, limit: number, windowMs: number): Promise<RateLimitResult> {
	if (!redisClient) {
		return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs };
	}

	const key = `rl:${ip}`;
	const ttlSec = Math.ceil(windowMs / 1000);

	try {
		// INCR and set EXPIRE if new
		const count = await redisClient.incr(key);
		if (count === 1) {
			await redisClient.expire(key, ttlSec);
		}

		const remaining = Math.max(0, limit - count);
		const ttl = await redisClient.ttl(key);
		const resetAt = Date.now() + ttl * 1000;

		if (count > limit) {
			return {
				allowed: false,
				remaining: 0,
				resetAt,
				retryAfter: ttl
			};
		}

		return {
			allowed: true,
			remaining,
			resetAt
		};
	} catch (error) {
		console.error('[rateLimit] Redis error:', error);
		// Fall back to allowing request if Redis fails
		return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs };
	}
}

function checkMemory(ip: string, limit: number, windowMs: number): RateLimitResult {
	const now = Date.now();
	const entry = ipMap.get(ip);

	if (!entry || entry.expiresAt <= now) {
		const resetAt = now + windowMs;
		ipMap.set(ip, { count: 1, expiresAt: resetAt, resetAt });
		return {
			allowed: true,
			remaining: limit - 1,
			resetAt
		};
	}

	if (entry.count >= limit) {
		return {
			allowed: false,
			remaining: 0,
			resetAt: entry.resetAt,
			retryAfter: Math.ceil((entry.resetAt - now) / 1000)
		};
	}

	entry.count += 1;
	return {
		allowed: true,
		remaining: limit - entry.count,
		resetAt: entry.resetAt
	};
}

/**
 * Check if request is allowed based on rate limit
 * @param ip Client IP address
 * @param limit Maximum requests allowed
 * @param windowMs Time window in milliseconds
 * @returns Rate limit result with metadata
 */
export async function check(ip: string, limit = 50, windowMs = 60_000): Promise<RateLimitResult> {
	if (redisClient) {
		return await checkRedis(ip, limit, windowMs);
	}
	return checkMemory(ip, limit, windowMs);
}

/**
 * Legacy allow function for backward compatibility
 * @deprecated Use check() instead for detailed rate limit info
 */
export async function allow(ip: string, limit = 50, windowMs = 60_000): Promise<boolean> {
	const result = await check(ip, limit, windowMs);
	return result.allowed;
}

/**
 * Reset rate limit for an IP
 */
export async function reset(ip: string): Promise<void> {
	if (redisClient) {
		try {
			await redisClient.del(`rl:${ip}`);
			return;
		} catch (error) {
			console.error('[rateLimit] Redis reset error:', error);
			// fall through to memory fallback
		}
	}
	ipMap.delete(ip);
}

/**
 * Clean up expired entries (for memory-based rate limiting)
 * Should be called periodically
 */
export function cleanup(): void {
	const now = Date.now();
	for (const [ip, entry] of ipMap.entries()) {
		if (entry.expiresAt <= now) {
			ipMap.delete(ip);
		}
	}
}

// Auto-cleanup every 5 minutes for memory-based storage
if (!redisClient) {
	setInterval(cleanup, 5 * 60 * 1000);
}
