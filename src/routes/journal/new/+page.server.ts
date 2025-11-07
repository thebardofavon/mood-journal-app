import type { PageServerLoad, Actions } from './$types';
import { validateSessionToken } from '$lib/server/auth';
import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import * as v from 'valibot';
import { ContentSchema, MoodSchema } from '$lib/server/validation';
import { storeEntryEmbedding } from '$lib/server/ai';
import { updateUserAchievements } from '$lib/server/achievement-tracker';
import { analyzeSentiment, detectMood } from '$lib/server/nlp';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('auth-session');
	const { user } = await validateSessionToken(token || '');
	if (!user) throw redirect(303, '/auth/login');

	return { user };
};

const CreateSchema = v.object({
	content: ContentSchema
	// mood is no longer required - it's auto-generated from NLP
});

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		try {
			// Authentication
			const token = cookies.get('auth-session');
			const { user } = await validateSessionToken(token || '');

			if (!user) {
				return fail(401, { error: 'Unauthorized. Please log in.' });
			}

			// Parse form data
			let form: FormData;
			try {
				form = await request.formData();
			} catch (parseError) {
				console.error('[journal/new] Form parse error:', parseError);
				return fail(400, { error: 'Invalid request format' });
			}

			const data = {
				content: String(form.get('content') || '').trim()
				// mood is no longer from form - auto-generated from NLP
			};

			// Validate input
			const parsed = v.safeParse(CreateSchema, data);
			if (!parsed.success) {
				const errors = parsed.issues.map((issue) => issue.message).join('. ');
				return fail(400, { error: `Validation failed: ${errors}` });
			}

			const id = crypto.randomUUID();
			const now = new Date();

			// Analyze sentiment
			let sentimentScore = 0;
			let sentimentLabel: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' = 'NEUTRAL';
			let autoMood = 'neutral';
			
			try {
				const sentimentResult = await analyzeSentiment(parsed.output.content);
				sentimentScore = Math.round(sentimentResult.normalizedScore * 100); // Convert to -100 to +100 scale
				sentimentLabel = sentimentResult.label;
				
				// Auto-detect mood from text content using NLP
				autoMood = detectMood(parsed.output.content, sentimentResult.normalizedScore);
				
				console.log('🔍 [Mood Detection]');
				console.log('   Content:', parsed.output.content);
				console.log('   Sentiment:', sentimentResult.normalizedScore);
				console.log('   Detected Mood:', autoMood);
			} catch (sentimentError) {
				console.error('[journal/new] Sentiment analysis failed:', sentimentError);
				// Continue with default neutral sentiment
			}

			// Insert entry with error handling
			try {
				// Insert entry
				await db.insert(table.entry).values({
					id,
					userId: user.id,
					content: parsed.output.content,
					mood: autoMood, // Auto-detected from NLP, not user input!
					sentimentScore,
					sentimentLabel,
					createdAt: now,
					updatedAt: now
				});

				// Generate embeddings for RAG (don't block on failure)
				try {
					const aiSettings = await db
						.select()
						.from(table.aiSettings)
						.where(eq(table.aiSettings.userId, user.id))
						.get();
					await storeEntryEmbedding(id, parsed.output.content, aiSettings || null);
				} catch (embeddingError) {
					console.error('[journal/new] Embedding generation failed:', embeddingError);
					// Don't fail the entry creation if embedding fails
				}

				// Update achievements and get newly unlocked
				const newlyUnlocked = await updateUserAchievements(user.id);
				
				// Return newly unlocked achievements before redirect
				if (newlyUnlocked && newlyUnlocked.length > 0) {
					// Store in session/cookie temporarily to show after redirect
					// For now, we'll use a different approach - redirect with state
				}
			} catch (error) {
				console.error('[journal/new] Database error:', error);
				return fail(500, { error: 'Failed to save entry. Please try again.' });
			}

			// Redirect to the new entry
			throw redirect(303, `/journal/${id}`);
		} catch (error) {
			// If it's a redirect, re-throw it
			if (error instanceof Response && error.status === 303) {
				throw error;
			}
			console.error('[journal/new] Unexpected error:', error);
			return fail(500, { error: 'An unexpected error occurred' });
		}
	}
};
