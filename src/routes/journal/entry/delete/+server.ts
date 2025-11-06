import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { validateSessionToken } from '$lib/server/auth';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

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

		// Parse form data
		let form: FormData;
		try {
			form = await request.formData();
		} catch (parseError) {
			console.error('[entry/delete] Form parse error:', parseError);
			return json({ ok: false, error: 'Invalid request format' }, { status: 400 });
		}

		const id = String(form.get('id') || '').trim();

		// Validate entry ID
		if (!id) {
			return json({ ok: false, error: 'Entry ID is required' }, { status: 400 });
		}

		// Delete entry with authorization check
		try {
			const result = await db
				.delete(table.entry)
				.where(and(eq(table.entry.id, id), eq(table.entry.userId, user.id)))
				.returning({ id: table.entry.id });

			if (result.length === 0) {
				return json({ ok: false, error: 'Entry not found or access denied' }, { status: 404 });
			}

			return json({ ok: true, deletedId: id });
		} catch (dbError) {
			console.error('[entry/delete] Database error:', dbError);
			return json({ ok: false, error: 'Failed to delete entry' }, { status: 500 });
		}
	} catch (error) {
		console.error('[entry/delete] Unexpected error:', error);
		return json({ ok: false, error: 'An unexpected error occurred' }, { status: 500 });
	}
};
