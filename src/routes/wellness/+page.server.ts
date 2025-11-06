import type { PageServerLoad } from './$types';
import { validateSessionToken } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import {
	generateRecommendations,
	BREATHING_EXERCISES,
	getRandomPrompt
} from '$lib/server/wellness';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('auth-session');
	const { user } = await validateSessionToken(token || '');
	if (!user) throw redirect(303, '/auth/login');

	try {
		// Get recent entries for analysis (last 30 days)
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const recentEntries = await db
			.select({
				mood: table.entry.mood,
				content: table.entry.content,
				sentimentScore: table.entry.sentimentScore,
				createdAt: table.entry.createdAt
			})
			.from(table.entry)
			.where(eq(table.entry.userId, user.id))
			.orderBy(desc(table.entry.createdAt))
			.limit(50);

		// Analyze mood patterns
		const moodPatterns = analyzeMoodPatterns(recentEntries);

		// Generate personalized recommendations (filter out null sentiment scores)
		const validEntries = recentEntries
			.filter((e) => e.sentimentScore !== null)
			.map((e) => ({
				...e,
				sentimentScore: e.sentimentScore!
			}));
		const recommendations = generateRecommendations(validEntries, moodPatterns);

		// Get journaling prompts
		const prompts = Array.from({ length: 5 }, () =>
			getRandomPrompt(recentEntries.length > 0 ? recentEntries[0].mood : 'neutral')
		);

		// Get breathing exercises
		const breathingExercises = BREATHING_EXERCISES;

		return {
			user,
			recommendations,
			prompts,
			breathingExercises,
			moodPatterns,
			recentEntriesCount: recentEntries.length
		};
	} catch (error) {
		console.error('Wellness load error:', error);
		return {
			user,
			recommendations: [],
			prompts: [],
			breathingExercises: [],
			moodPatterns: [],
			recentEntriesCount: 0
		};
	}
};

function analyzeMoodPatterns(
	entries: Array<{ mood: string; sentimentScore: number | null; createdAt: Date }>
) {
	const moodCounts: Record<string, { count: number; totalSentiment: number }> = {};

	for (const entry of entries) {
		const mood = entry.mood;
		const sentiment = entry.sentimentScore || 0;

		if (!moodCounts[mood]) {
			moodCounts[mood] = { count: 0, totalSentiment: 0 };
		}

		moodCounts[mood].count++;
		moodCounts[mood].totalSentiment += sentiment;
	}

	return Object.entries(moodCounts).map(([mood, data]) => ({
		mood,
		frequency: data.count,
		averageSentiment: data.totalSentiment / data.count
	}));
}
