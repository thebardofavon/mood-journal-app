import type { PageServerLoad, Actions } from './$types';
import { validateSessionToken } from '$lib/server/auth';
import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import * as v from 'valibot';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { ContentSchema, MoodSchema } from '$lib/server/validation';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const token = cookies.get('auth-session');
	const { user } = await validateSessionToken(token || '');
	if (!user) throw redirect(303, '/auth/login');

	const entryId = params.id;

	try {
		const rows = await db
			.select()
			.from(table.entry)
			.where(and(eq(table.entry.id, entryId), eq(table.entry.userId, user.id)))
			.limit(1);

		if (rows.length === 0) {
			throw error(404, 'Entry not found');
		}

		const entry = rows[0];

		// Fetch tags for this entry
		const tagData = await db
			.select({
				name: table.tag.name,
				type: table.tag.type
			})
			.from(table.entryTag)
			.innerJoin(table.tag, eq(table.entryTag.tagId, table.tag.id))
			.where(eq(table.entryTag.entryId, entryId));

		const html = sanitizeHtml(String(marked.parse(entry.content)), {
			allowedTags: sanitizeHtml.defaults.allowedTags.concat(['audio', 'source']),
			allowedAttributes: {
				...sanitizeHtml.defaults.allowedAttributes,
				audio: ['controls', 'src'],
				source: ['src'],
				img: ['src', 'alt', 'title', 'class']
			}
		});

		return {
			user,
			entry: {
				...entry,
				html,
				tags: tagData
			}
		};
	} catch (err) {
		if (err instanceof Response) throw err;
		console.error('[journal/[id]] Database error:', err);
		throw error(500, 'Failed to load entry');
	}
};

const UpdateSchema = v.object({
	content: ContentSchema,
	mood: MoodSchema
});

export const actions: Actions = {
	update: async ({ params, request, cookies }) => {
		try {
			const token = cookies.get('auth-session');
			const { user } = await validateSessionToken(token || '');

			if (!user) {
				return fail(401, { error: 'Unauthorized. Please log in.' });
			}

			const entryId = params.id;
			const form = await request.formData();
			const data = {
				content: String(form.get('content') || '').trim(),
				mood: String(form.get('mood') || 'neutral')
			};

			const parsed = v.safeParse(UpdateSchema, data);
			if (!parsed.success) {
				const errors = parsed.issues.map((issue) => issue.message).join('. ');
				return fail(400, { error: `Validation failed: ${errors}` });
			}

			try {
				await db
					.update(table.entry)
					.set({
						content: parsed.output.content,
						mood: parsed.output.mood,
						updatedAt: new Date()
					})
					.where(and(eq(table.entry.id, entryId), eq(table.entry.userId, user.id)));

				return { success: true };
			} catch (dbError) {
				console.error('[journal/[id]] Update error:', dbError);
				return fail(500, { error: 'Failed to update entry' });
			}
		} catch (error) {
			console.error('[journal/[id]] Unexpected error:', error);
			return fail(500, { error: 'An unexpected error occurred' });
		}
	},

	delete: async ({ params, cookies }) => {
		try {
			const token = cookies.get('auth-session');
			const { user } = await validateSessionToken(token || '');

			if (!user) {
				return fail(401, { error: 'Unauthorized. Please log in.' });
			}

			const entryId = params.id;

			try {
				await db
					.delete(table.entry)
					.where(and(eq(table.entry.id, entryId), eq(table.entry.userId, user.id)));

				throw redirect(303, '/journal');
			} catch (error) {
				if (error instanceof Response && error.status === 303) {
					throw error;
				}
				console.error('[journal/[id]] Delete error:', error);
				return fail(500, { error: 'Failed to delete entry' });
			}
		} catch (error) {
			if (error instanceof Response && error.status === 303) {
				throw error;
			}
			console.error('[journal/[id]] Unexpected error:', error);
			return fail(500, { error: 'An unexpected error occurred' });
		}
	}
};
