import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { validateSessionToken } from '$lib/server/auth';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import * as v from 'valibot';

// Validation schema for update
const UpdateSchema = v.object({
	id: v.pipe(v.string(), v.minLength(1)),
	content: v.pipe(v.string(), v.minLength(1), v.maxLength(10000)),
	mood: v.pipe(v.string(), v.picklist(['happy', 'neutral', 'sad', 'anxious']))
});

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		// Authentication
		const token = cookies.get('auth-session');
		if (!token) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { user } = await validateSessionToken(token);
		if (!user) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}

		// Parse and validate input
		let form: FormData;
		try {
			form = await request.formData();
		} catch (parseError) {
			console.error('[entry/update] Form parse error:', parseError);
			return json({ ok: false, error: 'Invalid request format' }, { status: 400 });
		}

		const data = {
			id: String(form.get('id') || ''),
			content: String(form.get('content') || ''),
			mood: String(form.get('mood') || 'neutral')
		};

		// Validate with valibot
		const parseResult = v.safeParse(UpdateSchema, data);
		if (!parseResult.success) {
			const errors = parseResult.issues.map((issue) => issue.message).join(', ');
			return json({ ok: false, error: `Validation failed: ${errors}` }, { status: 400 });
		}

		const { id, content, mood } = parseResult.output;
		const now = new Date();

		// Update entry with authorization check
		try {
			const result = await db
				.update(table.entry)
				.set({ content, mood, updatedAt: now })
				.where(and(eq(table.entry.id, id), eq(table.entry.userId, user.id)))
				.returning({ id: table.entry.id });

			if (result.length === 0) {
				return json({ ok: false, error: 'Entry not found or access denied' }, { status: 404 });
			}

			return json({ ok: true, entry: { id, content, mood, updatedAt: now.toISOString() } });
		} catch (dbError) {
			console.error('[entry/update] Database error:', dbError);
			return json({ ok: false, error: 'Failed to update entry' }, { status: 500 });
		}
	} catch (error) {
		console.error('[entry/update] Unexpected error:', error);
		return json({ ok: false, error: 'An unexpected error occurred' }, { status: 500 });
	}
};
