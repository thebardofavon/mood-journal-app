// Centralized environment loader using valibot with validation
import * as v from 'valibot';

const EnvSchema = v.object({
	// Required in production
	DATABASE_URL: v.optional(v.pipe(v.string(), v.minLength(1)), './data/app.db'),
	// Optional services
	OLLAMA_BASE_URL: v.optional(v.string(), 'http://localhost:11434'),
	OLLAMA_SENTIMENT_MODEL: v.optional(v.string(), 'llama3.2:1b'),
	REDIS_URL: v.optional(v.string()),
	OPENAI_API_KEY: v.optional(v.string()),
	GROQ_API_KEY: v.optional(v.string()),
	GEMINI_API_KEY: v.optional(v.string()),
	GOOGLE_CLIENT_ID: v.optional(v.string()),
	GOOGLE_CLIENT_SECRET: v.optional(v.string()),
	GOOGLE_REDIRECT_URI: v.optional(v.string()),
	NODE_ENV: v.optional(v.string(), 'development')
});

// Read from process.env so this works in Vitest and Node contexts
const keys = [
	'DATABASE_URL',
	'OLLAMA_BASE_URL',
	'OLLAMA_SENTIMENT_MODEL',
	'REDIS_URL',
	'OPENAI_API_KEY',
	'GROQ_API_KEY',
	'GEMINI_API_KEY',
	'GOOGLE_CLIENT_ID',
	'GOOGLE_CLIENT_SECRET',
	'GOOGLE_REDIRECT_URI',
	'NODE_ENV'
] as const;

const raw = Object.fromEntries(
	keys.map((k) => [k, process.env[k as keyof NodeJS.ProcessEnv]])
) as Record<string, string | undefined>;

// Validate environment variables
let validatedEnv;
try {
	validatedEnv = v.parse(EnvSchema, raw);
} catch (error) {
	console.error('Environment validation failed:');
	if (error instanceof v.ValiError) {
		for (const issue of error.issues) {
			console.error(
				`  - ${issue.path?.map((p: { key: string }) => p.key).join('.')}: ${issue.message}`
			);
		}
	}
	throw new Error('Invalid environment configuration. Please check your .env file.');
}

export const env = validatedEnv;

// Runtime validation helpers
export function requireEnv(key: keyof typeof env): string {
	const value = env[key];
	if (!value) {
		throw new Error(`Required environment variable ${key} is not set`);
	}
	return value;
}

export function validateProductionEnv(): void {
	if (env.NODE_ENV === 'production') {
		const required = ['DATABASE_URL'];
		const missing = required.filter((key) => !env[key as keyof typeof env]);

		if (missing.length > 0) {
			throw new Error(
				`Missing required environment variables for production: ${missing.join(', ')}`
			);
		}

		// Warn about missing optional but recommended vars
		if (!env.REDIS_URL) {
			console.warn(
				'[env] REDIS_URL not set - using in-memory rate limiting (not recommended for production)'
			);
		}
	}
}

// Validate on module load
validateProductionEnv();

export type Env = typeof env;
