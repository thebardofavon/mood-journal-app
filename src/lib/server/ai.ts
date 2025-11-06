import OpenAI from 'openai';
import { Groq } from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './env';
import { db } from './db';
import { conversation, entry, aiSettings, entryEmbedding } from './db/schema';
import type { AiSettings, Entry } from './db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { parseEmbedding, serializeEmbedding, cosineSimilarity } from './vector';

/**
 * AI Conversational Companion
 * Provides context-aware conversations about journal entries and mood patterns
 */

export interface Message {
	role: 'user' | 'assistant' | 'system';
	content: string;
}

type AIProvider = 'openai' | 'groq' | 'gemini' | 'local';

type ProviderConfig =
	| { provider: 'openai'; model: string; apiKey: string }
	| { provider: 'groq'; model: string; apiKey: string }
	| { provider: 'gemini'; model: string; apiKey: string }
	| { provider: 'local'; model: string };

const DEFAULT_MODELS: Record<AIProvider, string> = {
	openai: 'gpt-4o-mini',
	groq: 'llama3-8b-8192',
	gemini: 'gemini-1.5-flash',
	local: 'llama3.2:3b'
};

const FALLBACK_RESPONSE = "I'm here to listen.";
const FALLBACK_FOLLOW_UP = "How are you feeling about what you've written?";

// Ollama API endpoint (configurable via environment)
const OLLAMA_BASE_URL = env.OLLAMA_BASE_URL || 'http://localhost:11434';

function sanitizeKey(value: string | null | undefined): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	return trimmed.length === 0 ? null : trimmed;
}

function normalizeProvider(provider?: string | null): AIProvider {
	switch ((provider ?? '').toLowerCase()) {
		case 'groq':
			return 'groq';
		case 'gemini':
			return 'gemini';
		case 'local':
			return 'local';
		default:
			return 'openai';
	}
}

function resolveProviderConfig(settings?: AiSettings | null): ProviderConfig {
	const provider = normalizeProvider(settings?.provider);
	const modelFallback = DEFAULT_MODELS[provider];
	const model =
		settings?.model && settings.model.trim().length > 0 ? settings.model.trim() : modelFallback;

	switch (provider) {
		case 'openai': {
			const apiKey = sanitizeKey(settings?.openaiApiKey) ?? sanitizeKey(env.OPENAI_API_KEY);
			if (!apiKey) throw new Error('OpenAI API key is not configured.');
			return { provider, model, apiKey };
		}
		case 'groq': {
			const apiKey = sanitizeKey(settings?.groqApiKey) ?? sanitizeKey(env.GROQ_API_KEY);
			if (!apiKey) throw new Error('Groq API key is not configured.');
			return { provider, model, apiKey };
		}
		case 'gemini': {
			const apiKey = sanitizeKey(settings?.geminiApiKey) ?? sanitizeKey(env.GEMINI_API_KEY);
			if (!apiKey) throw new Error('Gemini API key is not configured.');
			return { provider, model, apiKey };
		}
		case 'local':
		default:
			return { provider: 'local', model };
	}
}

/**
 * Check if Ollama is available
 */
async function checkOllamaAvailable(): Promise<boolean> {
	try {
		const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
			method: 'GET',
			signal: AbortSignal.timeout(2000)
		});
		return response.ok;
	} catch {
		return false;
	}
}

/**
 * List available Ollama models
 */
async function listOllamaModels(): Promise<string[]> {
	try {
		const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
		if (!response.ok) return [];
		const data: { models?: Array<{ name: string }> } = await response.json();
		return data.models?.map((m) => m.name) || [];
	} catch {
		return [];
	}
}

/**
 * Run chat completion with Ollama
 */
async function runLocalChatCompletion(
	messages: Message[],
	model: string,
	opts: {
		maxTokens: number;
		temperature: number;
	}
): Promise<string> {
	const targetModel = model.trim().length > 0 ? model.trim() : DEFAULT_MODELS.local;

	// Check if Ollama is running
	const isAvailable = await checkOllamaAvailable();
	if (!isAvailable) {
		throw new Error(
			'Ollama is not running. Please:\n' +
				'1. Install Ollama from https://ollama.com\n' +
				'2. Start Ollama\n' +
				`3. Pull a model: ollama pull ${targetModel}\n\n` +
				'Or switch to a cloud provider (Groq, OpenAI, or Gemini) in AI settings.'
		);
	}

	try {
		const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: targetModel,
				messages: messages.map((msg) => ({
					role: msg.role,
					content: msg.content
				})),
				stream: false,
				options: {
					temperature: opts.temperature,
					num_predict: opts.maxTokens
				}
			})
		});

		if (!response.ok) {
			const error = await response.text();
			if (error.includes('model') && error.includes('not found')) {
				const availableModels = await listOllamaModels();
				throw new Error(
					`Model "${targetModel}" not found in Ollama.\n` +
						(availableModels.length > 0
							? `Available models: ${availableModels.join(', ')}\n`
							: '') +
						`\nTo use this model, run: ollama pull ${targetModel}\n` +
						'Recommended models: llama3.2:3b, llama3.2:1b, gemma2:2b, qwen2.5:3b'
				);
			}
			throw new Error(`Ollama API error: ${error}`);
		}

		const data = await response.json();
		const content = data.message?.content?.trim();
		return content || FALLBACK_RESPONSE;
	} catch (error) {
		if (error instanceof Error && error.message.includes('Ollama')) {
			throw error;
		}
		throw new Error(
			`Failed to communicate with Ollama: ${error instanceof Error ? error.message : 'Unknown error'}\n` +
				'Make sure Ollama is running and accessible at ' +
				OLLAMA_BASE_URL
		);
	}
}

function mapMessages(messages: Message[]) {
	return messages.map((msg) => ({ role: msg.role, content: msg.content }));
}

/**
 * Get user's AI settings
 */
export async function getAISettings(userId: string) {
	const settings = await db.select().from(aiSettings).where(eq(aiSettings.userId, userId)).get();

	return settings;
}

/**
 * Save user's AI settings
 */
export async function saveAISettings(
	userId: string,
	data: {
		ai_enabled?: boolean;
		privacy_consent?: boolean;
		provider?: string;
		model?: string;
		openai_api_key?: string | null;
		groq_api_key?: string | null;
		gemini_api_key?: string | null;
	}
) {
	const existing = await getAISettings(userId);
	const now = new Date();
	const provider = normalizeProvider(data.provider);
	const requestedModel = data.model && data.model.trim().length > 0 ? data.model.trim() : undefined;
	const model = requestedModel ?? DEFAULT_MODELS[provider];

	const sanitizedOpenAI = 'openai_api_key' in data ? sanitizeKey(data.openai_api_key) : undefined;
	const sanitizedGroq = 'groq_api_key' in data ? sanitizeKey(data.groq_api_key) : undefined;
	const sanitizedGemini = 'gemini_api_key' in data ? sanitizeKey(data.gemini_api_key) : undefined;

	if (existing) {
		const updateData: Record<string, unknown> = { updatedAt: now };

		if (typeof data.ai_enabled === 'boolean') updateData.aiEnabled = data.ai_enabled;
		if (typeof data.privacy_consent === 'boolean') updateData.privacyConsent = data.privacy_consent;
		if (data.provider) updateData.provider = provider;
		if (data.model || data.provider) updateData.model = model;
		if (sanitizedOpenAI !== undefined) updateData.openaiApiKey = sanitizedOpenAI;
		if (sanitizedGroq !== undefined) updateData.groqApiKey = sanitizedGroq;
		if (sanitizedGemini !== undefined) updateData.geminiApiKey = sanitizedGemini;

		await db.update(aiSettings).set(updateData).where(eq(aiSettings.userId, userId));
	} else {
		await db.insert(aiSettings).values({
			userId,
			aiEnabled: data.ai_enabled ?? false,
			privacyConsent: data.privacy_consent ?? false,
			provider,
			model,
			openaiApiKey: sanitizeKey(data.openai_api_key) ?? null,
			groqApiKey: sanitizeKey(data.groq_api_key) ?? null,
			geminiApiKey: sanitizeKey(data.gemini_api_key) ?? null,
			updatedAt: now
		});
	}
}

/**
 * Get conversation history for context
 */
export async function getConversationHistory(userId: string, entryId?: string, limit: number = 10) {
	const query = entryId
		? and(eq(conversation.userId, userId), eq(conversation.entryId, entryId))
		: eq(conversation.userId, userId);

	const messages = await db
		.select()
		.from(conversation)
		.where(query)
		.orderBy(desc(conversation.createdAt))
		.limit(limit)
		.all();

	return messages.reverse(); // Oldest first for context
}

/**
 * Save a conversation message
 */
export async function saveMessage(
	userId: string,
	role: 'user' | 'assistant',
	content: string,
	entryId?: string
) {
	await db.insert(conversation).values({
		id: crypto.randomUUID(),
		userId,
		entryId: entryId ?? null,
		role,
		content,
		createdAt: new Date()
	});
}

/**
 * Build context from recent journal entries
 */
async function buildJournalContext(userId: string, entryId?: string): Promise<string> {
	const recentEntries = await db
		.select()
		.from(entry)
		.where(eq(entry.userId, userId))
		.orderBy(desc(entry.createdAt))
		.limit(5)
		.all();

	if (recentEntries.length === 0) {
		return 'The user has not written any journal entries yet.';
	}

	// If specific entry is referenced, highlight it
	const currentEntry = entryId ? recentEntries.find((e) => e.id === entryId) : recentEntries[0];

	let context = `Recent journal entries:\n\n`;

	if (currentEntry) {
		const date = new Date(currentEntry.createdAt).toLocaleDateString();
		const sentiment =
			currentEntry.sentimentLabel === 'POSITIVE'
				? '😊 positive'
				: currentEntry.sentimentLabel === 'NEGATIVE'
					? '😔 negative'
					: '😐 neutral';

		context += `Most recent entry (${date}, ${sentiment}):\n"${currentEntry.content}"\n\n`;

		if (recentEntries.length > 1) {
			context += `Previous entries:\n`;
			recentEntries
				.filter((e) => e.id !== currentEntry.id)
				.forEach((e) => {
					const entryDate = new Date(e.createdAt).toLocaleDateString();
					const entrySentiment =
						e.sentimentLabel === 'POSITIVE' ? '😊' : e.sentimentLabel === 'NEGATIVE' ? '😔' : '😐';
					context += `- ${entryDate} ${entrySentiment}: "${e.content.substring(0, 100)}${e.content.length > 100 ? '...' : ''}"\n`;
				});
		}
	}

	return context;
}

/**
 * Generate a thoughtful follow-up question after entry creation
 */
export async function generateFollowUpQuestion(
	userId: string,
	entryId: string,
	settings: AiSettings | null
): Promise<string> {
	const context = await buildJournalContext(userId, entryId);

	const systemPrompt = `You are a compassionate AI companion for a mood journal app. Your role is to ask ONE thoughtful, open-ended follow-up question after the user writes a journal entry. 

Guidelines:
- Be warm, empathetic, and non-judgmental
- Ask questions that encourage deeper reflection
- Keep questions concise (1-2 sentences max)
- Don't give advice unless explicitly asked
- Use the journal context to make questions relevant
- Avoid repetitive questions
- Focus on emotions, thoughts, or patterns you notice

${context}`;

	const providerConfig = resolveProviderConfig(settings);

	const promptMessage: Message = {
		role: 'user',
		content: 'I just finished writing this journal entry. Ask me one thoughtful follow-up question.'
	};

	switch (providerConfig.provider) {
		case 'openai': {
			const client = new OpenAI({ apiKey: providerConfig.apiKey });
			const response = await client.chat.completions.create({
				model: providerConfig.model,
				messages: [{ role: 'system', content: systemPrompt }, promptMessage],
				temperature: 0.8,
				max_tokens: 100
			});
			return response.choices[0]?.message?.content?.trim() || FALLBACK_FOLLOW_UP;
		}
		case 'groq': {
			const client = new Groq({ apiKey: providerConfig.apiKey });
			const response = await client.chat.completions.create({
				model: providerConfig.model,
				messages: [{ role: 'system', content: systemPrompt }, promptMessage],
				temperature: 0.8,
				max_tokens: 100
			});
			return response.choices[0]?.message?.content?.trim() || FALLBACK_FOLLOW_UP;
		}
		case 'gemini': {
			const client = new GoogleGenerativeAI(providerConfig.apiKey);
			const model = client.getGenerativeModel({
				model: providerConfig.model,
				systemInstruction: systemPrompt
			});
			const result = await model.generateContent({
				contents: [
					{
						role: 'user',
						parts: [{ text: promptMessage.content }]
					}
				]
			});
			return result.response.text()?.trim() || FALLBACK_FOLLOW_UP;
		}
		case 'local':
		default: {
			const response = await runLocalChatCompletion(
				[{ role: 'system', content: systemPrompt }, promptMessage],
				providerConfig.model,
				{ maxTokens: 120, temperature: 0.8 }
			);
			return response || FALLBACK_FOLLOW_UP;
		}
	}
}

/**
 * Chat with the AI companion
 */
export async function chat(
	userId: string,
	userMessage: string,
	settings: AiSettings | null,
	entryId?: string
): Promise<string> {
	// Save user message
	await saveMessage(userId, 'user', userMessage, entryId);

	// Get conversation history and journal context
	const history = await getConversationHistory(userId, entryId, 10);
	const journalContext = await buildJournalContext(userId, entryId);

	// Retrieve similar entries using RAG
	let ragContext = '';
	try {
		const similarEntries = await retrieveSimilarEntries(userMessage, userId, settings, 3, entryId);
		if (similarEntries.length > 0) {
			ragContext =
				'\n\nRelevant past entries for additional context:\n' +
				similarEntries
					.map(({ entry, similarity }) => {
						const date = new Date(entry.createdAt).toLocaleDateString();
						const sentiment =
							entry.sentimentLabel === 'POSITIVE'
								? '😊'
								: entry.sentimentLabel === 'NEGATIVE'
									? '😔'
									: '😐';
						return `${date} ${sentiment} (relevance: ${(similarity * 100).toFixed(0)}%):\n"${entry.content}"`;
					})
					.join('\n\n');
		}
	} catch (error) {
		console.error('RAG retrieval failed:', error);
		// Continue without RAG context if retrieval fails
	}

	const systemPrompt = `You are a compassionate AI companion for a mood journal app. Your role is to help users reflect on their emotions, identify patterns, and gain insights from their journal entries.

Guidelines:
- Be warm, empathetic, and genuinely curious
- Listen actively and validate emotions
- Help identify patterns across entries
- Ask clarifying questions when appropriate
- Offer gentle insights, not advice
- Respect privacy and maintain confidentiality
- Keep responses conversational (2-4 sentences)
- Use the journal context and any relevant past entries to provide personalized support

${journalContext}${ragContext}`;

	// Build messages array
	const messages: Message[] = [
		{ role: 'system', content: systemPrompt },
		...history.map(
			(msg): Message => ({
				role: msg.role as 'user' | 'assistant',
				content: msg.content
			})
		),
		{ role: 'user', content: userMessage }
	];

	const providerConfig = resolveProviderConfig(settings);

	let assistantMessage: string;

	switch (providerConfig.provider) {
		case 'openai': {
			const client = new OpenAI({ apiKey: providerConfig.apiKey });
			const response = await client.chat.completions.create({
				model: providerConfig.model,
				messages: mapMessages(messages),
				temperature: 0.7,
				max_tokens: 300
			});
			assistantMessage = response.choices[0]?.message?.content?.trim() || FALLBACK_RESPONSE;
			break;
		}
		case 'groq': {
			const client = new Groq({ apiKey: providerConfig.apiKey });
			const response = await client.chat.completions.create({
				model: providerConfig.model,
				messages: mapMessages(messages),
				temperature: 0.7,
				max_tokens: 300
			});
			assistantMessage = response.choices[0]?.message?.content?.trim() || FALLBACK_RESPONSE;
			break;
		}
		case 'gemini': {
			const systemInstruction = messages[0]?.role === 'system' ? messages[0].content : '';
			const messageBody = systemInstruction ? messages.slice(1) : messages;
			const historyMessages = messageBody.slice(0, -1).map((msg) => ({
				role: msg.role === 'assistant' ? 'model' : 'user',
				parts: [{ text: msg.content }]
			}));
			const latest = messageBody[messageBody.length - 1];
			const client = new GoogleGenerativeAI(providerConfig.apiKey);
			const model = client.getGenerativeModel({
				model: providerConfig.model,
				systemInstruction
			});
			const chatSession = model.startChat({ history: historyMessages });
			const result = await chatSession.sendMessage(latest.content);
			assistantMessage = result.response.text()?.trim() || FALLBACK_RESPONSE;
			break;
		}
		case 'local':
		default: {
			assistantMessage = await runLocalChatCompletion(messages, providerConfig.model, {
				maxTokens: 300,
				temperature: 0.7
			});
			break;
		}
	}

	// Save assistant response
	await saveMessage(userId, 'assistant', assistantMessage, entryId);

	return assistantMessage;
}

/**
 * Clear conversation history
 */
export async function clearConversation(userId: string, entryId?: string) {
	const query = entryId
		? and(eq(conversation.userId, userId), eq(conversation.entryId, entryId))
		: eq(conversation.userId, userId);

	await db.delete(conversation).where(query);
}

/**
 * Generate embeddings for a text using OpenAI
 */
async function generateOpenAIEmbedding(text: string, apiKey: string): Promise<number[]> {
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
async function generateLocalEmbedding(text: string, model: string): Promise<number[]> {
	const targetModel = model.trim().length > 0 ? model.trim() : 'nomic-embed-text';

	// Check if Ollama is running
	const isAvailable = await checkOllamaAvailable();
	if (!isAvailable) {
		throw new Error('Ollama is not running. Cannot generate embeddings.');
	}

	try {
		const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
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
 * Generate embedding for text based on provider config
 */
async function generateEmbedding(text: string, providerConfig: ProviderConfig): Promise<number[]> {
	switch (providerConfig.provider) {
		case 'openai':
			return generateOpenAIEmbedding(text, providerConfig.apiKey);
		case 'local':
		default:
			return generateLocalEmbedding(text, providerConfig.model);
	}
}

/**
 * Store embedding for a journal entry
 */
export async function storeEntryEmbedding(
	entryId: string,
	content: string,
	settings: AiSettings | null
): Promise<void> {
	try {
		const providerConfig = resolveProviderConfig(settings);
		const embedding = await generateEmbedding(content, providerConfig);
		const embeddingJson = serializeEmbedding(embedding);
		const model =
			providerConfig.provider === 'openai' ? 'text-embedding-3-small' : providerConfig.model;

		// Check if embedding already exists
		const existing = await db
			.select()
			.from(entryEmbedding)
			.where(eq(entryEmbedding.entryId, entryId))
			.get();

		const now = new Date();
		if (existing) {
			// Update existing embedding
			await db
				.update(entryEmbedding)
				.set({
					embedding: embeddingJson,
					embeddingModel: model,
					updatedAt: now
				})
				.where(eq(entryEmbedding.entryId, entryId));
		} else {
			// Create new embedding
			await db.insert(entryEmbedding).values({
				id: crypto.randomUUID(),
				entryId,
				embedding: embeddingJson,
				embeddingModel: model,
				createdAt: now,
				updatedAt: now
			});
		}
	} catch (error) {
		console.error('Failed to store entry embedding:', error);
		// Don't throw - embedding generation failure shouldn't break journal entry creation
	}
}

/**
 * Retrieve similar entries based on semantic similarity
 */
export async function retrieveSimilarEntries(
	query: string,
	userId: string,
	settings: AiSettings | null,
	limit: number = 5,
	entryIdToExclude?: string
): Promise<Array<{ entry: Entry; similarity: number }>> {
	try {
		const providerConfig = resolveProviderConfig(settings);
		const queryEmbedding = await generateEmbedding(query, providerConfig);

		// Get all embeddings for user's entries
		const userEmbeddings = await db
			.select({
				embedding: entryEmbedding.embedding,
				entryId: entryEmbedding.entryId,
				entry: entry
			})
			.from(entryEmbedding)
			.innerJoin(entry, eq(entryEmbedding.entryId, entry.id))
			.where(eq(entry.userId, userId))
			.all();

		if (userEmbeddings.length === 0) {
			return [];
		}

		// Parse embeddings and calculate similarities
		const similarities = userEmbeddings
			.filter((e) => e.entryId !== entryIdToExclude) // Exclude the current entry if specified
			.map((e) => ({
				entry: e.entry,
				similarity: cosineSimilarity(queryEmbedding, parseEmbedding(e.embedding))
			}))
			.sort((a, b) => b.similarity - a.similarity)
			.slice(0, limit);

		return similarities;
	} catch (error) {
		console.error('Failed to retrieve similar entries:', error);
		return [];
	}
}
