import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import fs from 'node:fs/promises';
import path from 'node:path';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/auth/login');
	const [row] = await db
		.select({
			id: table.user.id,
			username: table.user.username,
			email: table.user.email,
			avatarUrl: table.user.avatarUrl
		})
		.from(table.user)
		.where(eq(table.user.id, locals.user.id));

	const linkedAccounts = await db
		.select({
			provider: table.account.provider,
			providerAccountId: table.account.providerAccountId
		})
		.from(table.account)
		.where(eq(table.account.userId, locals.user.id));

	return {
		user: { id: row.id, username: row.username, email: row.email, avatarUrl: row.avatarUrl },
		linkedAccounts
	};
};

export const actions: Actions = {
	update: async ({ request, locals }) => {
		if (!locals.user) throw redirect(303, '/auth/login');
		const form = await request.formData();
		const username = String(form.get('username') || '').trim();
		if (username.length < 2)
			return fail(400, { message: 'Username must be at least 2 characters' });

		await db.update(table.user).set({ username }).where(eq(table.user.id, locals.user.id));

		// Update the session with new username
		if (locals.session) {
			locals.user.username = username;
		}

		return { ok: true };
	},
	avatar: async ({ request, locals }) => {
		if (!locals.user) throw redirect(303, '/auth/login');
		const form = await request.formData();
		const file = form.get('avatar') as File | null;
		if (!file || file.size === 0) return fail(400, { message: 'No file' });
		if (!file.type.startsWith('image/')) return fail(400, { message: 'Invalid file type' });
		if (file.size > 2 * 1024 * 1024) return fail(400, { message: 'File too large' });
		const ext = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : 'png';
		const uploadsDir = path.resolve('static/uploads/avatars');
		await fs.mkdir(uploadsDir, { recursive: true });
		const filename = `${locals.user.id}.${ext}`;
		const filepath = path.join(uploadsDir, filename);
		const arrayBuffer = await file.arrayBuffer();
		await fs.writeFile(filepath, Buffer.from(arrayBuffer));
		const url = `/uploads/avatars/${filename}`;
		await db.update(table.user).set({ avatarUrl: url }).where(eq(table.user.id, locals.user.id));
		return { ok: true, url };
	}
};
