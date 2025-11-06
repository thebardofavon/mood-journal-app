import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { entry } from '$lib/server/db/schema';
import { eq, desc, gte, lte, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user?.id) {
		throw new Error('Unauthorized');
	}

	// Get all entries for the user
	const entries = await db
		.select({
			id: entry.id,
			content: entry.content,
			mood: entry.mood,
			sentimentScore: entry.sentimentScore,
			sentimentLabel: entry.sentimentLabel,
			createdAt: entry.createdAt
		})
		.from(entry)
		.where(eq(entry.userId, user.id))
		.orderBy(desc(entry.createdAt));

	// Get date range
	const oldestDate = entries.length > 0 ? entries[entries.length - 1].createdAt : new Date();
	const newestDate = entries.length > 0 ? entries[0].createdAt : new Date();

	return {
		entries,
		totalEntries: entries.length,
		dateRange: {
			oldest: oldestDate,
			newest: newestDate
		},
		user: {
			name: user.username,
			email: user.email
		}
	};
};
