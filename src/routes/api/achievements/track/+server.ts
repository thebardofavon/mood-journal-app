import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken } from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Track user actions for achievements
 * POST /api/achievements/track
 * Body: { action: 'view_analytics' | 'search' | 'export' | 'use_ai' }
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const token = cookies.get('auth-session');
		const { user } = await validateSessionToken(token || '');
		
		if (!user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { action } = await request.json();

		if (!action) {
			return json({ error: 'Action required' }, { status: 400 });
		}

		const now = new Date();

		// Store action in a tracking table or update user stats
		// For now, we'll use a simple approach with user metadata or a new table
		// Since we don't have an action tracking table, we'll mark achievements directly

		// Get or create user progress
		const [userProgress] = await db
			.select()
			.from(table.userProgress)
			.where(eq(table.userProgress.userId, user.id))
			.limit(1);

		// Track the action in user progress metadata (we'd need to extend schema)
		// For now, let's just trigger achievement update
		const { updateUserAchievements } = await import('$lib/server/achievement-tracker');
		const newlyUnlocked = await updateUserAchievements(user.id);

		return json({ success: true, newlyUnlocked });
	} catch (error) {
		console.error('Achievement tracking error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
