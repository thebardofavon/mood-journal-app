#!/usr/bin/env node

/**
 * Backfill embeddings for existing journal entries
 * Run this script to generate embeddings for entries that don't have them yet
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../src/lib/server/db/schema.js';
import { eq, isNull } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { parseEmbedding, serializeEmbedding } from '../src/lib/server/vector.js';

// Get database path from environment
const dbPath = process.env.DATABASE_URL;
if (!dbPath) {
	throw new Error('DATABASE_URL environment variable is required');
}

// Ensure database directory exists
try {
	const dbDir = path.dirname(dbPath);
	if (!fs.existsSync(dbDir)) {
		console.log(`[db] Creating database directory: ${dbDir}`);
		fs.mkdirSync(dbDir, { recursive: true });
	}
} catch (error) {
	console.error('[db] Failed to create database directory:', error);
}

// Create database connection
const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

/**
 * Generate embeddings for a text using OpenAI
 */
async function generateOpenAIEmbedding(text, apiKey) {
	const OpenAI = (await import('openai')).default;
	const client = new OpenAI({ apiKey });
	const response = await client.embeddings.create({
		model: 'text-embedding-3-small',
		input: text,
		encoding_format: 'float'
	});
	return response.data[0].embedding;
}

/**
 * Generate embeddings for a text using local Ollama models
 */
async function generateLocalEmbedding(text, model) {
	const targetModel = model.trim().length > 0 ? model.trim() : 'nomic-embed-text';

	// Check if Ollama is running
	const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
	const isAvailable = await checkOllamaAvailable(ollamaBaseUrl);
	if (!isAvailable) {
		throw new Error('Ollama is not running. Cannot generate embeddings.');
	}

	try {
		const response = await fetch(`${ollamaBaseUrl}/api/embeddings`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: targetModel,
				prompt: text
			})
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Ollama embedding API error: ${error}`);
		}

		const data = await response.json();
		const embedding = data.embedding;

		if (!Array.isArray(embedding) || !embedding.every((n) => typeof n === 'number')) {
			throw new Error('Invalid embedding response from Ollama');
		}

		return embedding;
	} catch (error) {
		if (error instanceof Error && error.message.includes('Ollama')) {
			throw error;
		}
		throw new Error(
			`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

/**
 * Check if Ollama is available
 */
async function checkOllamaAvailable(baseUrl) {
	try {
		const response = await fetch(`${baseUrl}/api/tags`, {
			method: 'GET',
			signal: AbortSignal.timeout(2000)
		});
		return response.ok;
	} catch {
		return false;
	}
}

/**
 * Generate embedding for text based on provider config
 */
async function generateEmbedding(text, providerConfig) {
	switch (providerConfig.provider) {
		case 'openai':
			return generateOpenAIEmbedding(text, providerConfig.apiKey);
		case 'local':
		default:
			return generateLocalEmbedding(text, providerConfig.model);
	}
}

/**
 * Resolve provider config
 */
function resolveProviderConfig(settings) {
	const provider = settings?.provider?.toLowerCase() || 'local'; // Default to local instead of openai
	const modelFallback =
		{
			openai: 'gpt-4o-mini',
			groq: 'llama3-8b-8192',
			gemini: 'gemini-1.5-flash',
			local: 'nomic-embed-text' // Use nomic-embed-text for embeddings
		}[provider] || 'nomic-embed-text';
	const model =
		settings?.model && settings.model.trim().length > 0 ? settings.model.trim() : modelFallback;

	switch (provider) {
		case 'openai': {
			const apiKey = settings?.openaiApiKey || process.env.OPENAI_API_KEY;
			if (!apiKey) {
				// Fall back to local if no OpenAI key
				return { provider: 'local', model: 'nomic-embed-text' };
			}
			return { provider, model, apiKey };
		}
		case 'groq': {
			const apiKey = settings?.groqApiKey || process.env.GROQ_API_KEY;
			if (!apiKey) {
				// Fall back to local if no Groq key
				return { provider: 'local', model: 'nomic-embed-text' };
			}
			return { provider, model, apiKey };
		}
		case 'gemini': {
			const apiKey = settings?.geminiApiKey || process.env.GEMINI_API_KEY;
			if (!apiKey) {
				// Fall back to local if no Gemini key
				return { provider: 'local', model: 'nomic-embed-text' };
			}
			return { provider, model, apiKey };
		}
		case 'local':
		default:
			return { provider: 'local', model };
	}
}

/**
 * Store embedding for a journal entry
 */
async function storeEntryEmbedding(entryId, content, settings) {
	try {
		const providerConfig = resolveProviderConfig(settings);
		const embedding = await generateEmbedding(content, providerConfig);
		const embeddingJson = serializeEmbedding(embedding);
		const model =
			providerConfig.provider === 'openai' ? 'text-embedding-3-small' : providerConfig.model;

		// Check if embedding already exists
		const existing = await db
			.select()
			.from(schema.entryEmbedding)
			.where(eq(schema.entryEmbedding.entryId, entryId))
			.get();

		const now = new Date();
		if (existing) {
			// Update existing embedding
			await db
				.update(schema.entryEmbedding)
				.set({
					embedding: embeddingJson,
					embeddingModel: model,
					updatedAt: now
				})
				.where(eq(schema.entryEmbedding.entryId, entryId));
		} else {
			// Create new embedding
			await db.insert(schema.entryEmbedding).values({
				id: crypto.randomUUID(),
				entryId,
				embedding: embeddingJson,
				embeddingModel: model,
				createdAt: now,
				updatedAt: now
			});
		}
		return true; // Success
	} catch (error) {
		console.error('Failed to store entry embedding:', error);
		throw error; // Re-throw so the caller knows it failed
	}
}

async function backfillEmbeddings() {
	console.log('Starting embedding backfill...');

	try {
		// Get all entries that don't have embeddings yet
		const entriesWithoutEmbeddings = await db
			.select({
				id: schema.entry.id,
				content: schema.entry.content,
				userId: schema.entry.userId
			})
			.from(schema.entry)
			.leftJoin(schema.entryEmbedding, eq(schema.entry.id, schema.entryEmbedding.entryId))
			.where(isNull(schema.entryEmbedding.entryId));

		console.log(`Found ${entriesWithoutEmbeddings.length} entries without embeddings`);

		let successCount = 0;
		let errorCount = 0;

		for (const entryData of entriesWithoutEmbeddings) {
			try {
				// Get user's AI settings
				const settings = await db
					.select()
					.from(schema.aiSettings)
					.where(eq(schema.aiSettings.userId, entryData.userId))
					.get();

				// Generate embedding
				await storeEntryEmbedding(entryData.id, entryData.content, settings || null);

				successCount++;
				console.log(`✓ Generated embedding for entry ${entryData.id}`);

				// Small delay to avoid rate limiting
				await new Promise((resolve) => setTimeout(resolve, 100));
			} catch (error) {
				console.error(`✗ Failed to generate embedding for entry ${entryData.id}:`, error.message);
				errorCount++;
			}
		}

		console.log(`\nBackfill complete:`);
		console.log(`- Successfully processed: ${successCount} entries`);
		console.log(`- Failed: ${errorCount} entries`);

		if (errorCount > 0) {
			console.log(`\nNote: Some embeddings failed to generate. This could be because:`);
			console.log(`- No AI API keys are configured (OpenAI, Groq, Gemini)`);
			console.log(`- Ollama is not running or the required model is not pulled`);
			console.log(`- To fix this, either:`);
			console.log(`  1. Configure AI API keys in your app settings`);
			console.log(`  2. Start Ollama and pull an embedding model: ollama pull nomic-embed-text`);
			console.log(
				`- The RAG feature will work better with embeddings, but the chatbot still functions without them.`
			);
		}
	} catch (error) {
		console.error('Backfill failed:', error);
		process.exit(1);
	}
}

// Run the backfill
backfillEmbeddings()
	.then(() => {
		console.log('Backfill script completed');
		process.exit(0);
	})
	.catch((error) => {
		console.error('Script failed:', error);
		process.exit(1);
	});
