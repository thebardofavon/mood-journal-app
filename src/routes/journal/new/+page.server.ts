import type { PageServerLoad, Actions } from './$types';
import { validateSessionToken } from '$lib/server/auth';
import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import * as v from 'valibot';
import { ContentSchema, MoodSchema } from '$lib/server/validation';
import { storeEntryEmbedding } from '$lib/server/ai';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('auth-session');
	const { user } = await validateSessionToken(token || '');
	if (!user) throw redirect(303, '/auth/login');

	return { user };
};

const CreateSchema = v.object({
	content: ContentSchema,
	mood: MoodSchema
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
				content: String(form.get('content') || '').trim(),
				mood: String(form.get('mood') || 'neutral')
			};

			// Validate input
			const parsed = v.safeParse(CreateSchema, data);
			if (!parsed.success) {
				const errors = parsed.issues.map((issue) => issue.message).join('. ');
				return fail(400, { error: `Validation failed: ${errors}` });
			}

			const id = crypto.randomUUID();
			const now = new Date();

			// Insert entry with error handling
			try {
				// Insert entry
				await db.insert(table.entry).values({
					id,
					userId: user.id,
					content: parsed.output.content,
					mood: parsed.output.mood,
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
