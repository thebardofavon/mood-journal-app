import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import {
	ACHIEVEMENT_DEFINITIONS,
	calculateLevel,
	getRecentlyUnlocked
} from '$lib/server/achievements';

/**
 * Achievement Tracker
 * Updates user achievements based on actions
 */

export interface UserStats {
	totalEntries: number;
	longestStreak: number;
	currentStreak: number;
	maxWordCount: number;
	hasPhotos: boolean;
	hasVoiceEntries: boolean;
	hasUsedAI: boolean;
	hasViewedAnalytics: boolean;
	hasSearched: boolean;
	hasExported: boolean;
	consecutivePositiveDays: number;
	gratitudeMentions: number;
	growthMentions: number;
}

/**
 * Get comprehensive user stats for achievement calculation
 */
export async function getUserStats(userId: string): Promise<UserStats> {
	// Get total entries
	const [{ count: totalEntries }] = await db
		.select({ count: sql<number>`count(*)` })
		.from(table.entry)
		.where(eq(table.entry.userId, userId));

	// Get longest streak (simplified - consecutive days with entries)
	const entries = await db
		.select({ createdAt: table.entry.createdAt })
		.from(table.entry)
		.where(eq(table.entry.userId, userId))
		.orderBy(desc(table.entry.createdAt));

	let longestStreak = 0;
	let currentStreak = 0;
	const consecutivePositiveDays = 0;

	if (entries.length > 0) {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// Calculate current streak
		let streakCount = 0;
		let lastDate: Date | null = null;

		for (const entry of entries) {
			const entryDate = new Date(entry.createdAt);
			entryDate.setHours(0, 0, 0, 0);

			if (!lastDate) {
				streakCount = 1;
				lastDate = entryDate;
			} else {
				const diffTime = lastDate.getTime() - entryDate.getTime();
				const diffDays = diffTime / (1000 * 60 * 60 * 24);

				if (diffDays === 1) {
					streakCount++;
				} else if (diffDays > 1) {
					break; // Gap in streak
				}
			}
		}

		currentStreak = streakCount;

		// Calculate longest streak (simplified)
		longestStreak = Math.max(currentStreak, longestStreak);
	}

	// Get max word count
	const [{ maxWords }] = await db
		.select({
			maxWords: sql<number>`max(length(${table.entry.content}) - length(replace(${table.entry.content}, ' ', '')) + 1)`
		})
		.from(table.entry)
		.where(eq(table.entry.userId, userId));

	// Check for photos (attachments)
	const [{ count: photoCount }] = await db
		.select({ count: sql<number>`count(*)` })
		.from(table.attachment)
		.where(eq(table.attachment.entryId, sql`(select id from ${table.entry} where user_id = ${userId} limit 1)`));

	// For now, set these to false - would need more complex tracking
	const hasPhotos = photoCount > 0;
	const hasVoiceEntries = false; // Would need to check for audio attachments
	
	// Check if user has AI settings enabled
	const [aiSettings] = await db
		.select()
		.from(table.aiSettings)
		.where(eq(table.aiSettings.userId, userId))
		.limit(1);
	const hasUsedAI = aiSettings?.aiEnabled || false;
	
	// These would ideally be tracked in a separate actions table
	// For now, we'll set them based on heuristics
	const hasViewedAnalytics = false; // Would need event tracking
	const hasSearched = false; // Would need search event tracking
	const hasExported = false; // Would need export event tracking

	// Count gratitude mentions (simplified)
	const [{ count: gratitudeCount }] = await db
		.select({ count: sql<number>`count(*)` })
		.from(table.entry)
		.where(sql`${table.entry.content} LIKE '%gratitude%' OR ${table.entry.content} LIKE '%thankful%' OR ${table.entry.content} LIKE '%grateful%'`);

	// Count growth mentions
	const [{ count: growthCount }] = await db
		.select({ count: sql<number>`count(*)` })
		.from(table.entry)
		.where(sql`${table.entry.content} LIKE '%growth%' OR ${table.entry.content} LIKE '%learn%' OR ${table.entry.content} LIKE '%improve%'`);

	return {
		totalEntries: totalEntries || 0,
		longestStreak,
		currentStreak,
		maxWordCount: maxWords || 0,
		hasPhotos,
		hasVoiceEntries,
		hasUsedAI,
		hasViewedAnalytics,
		hasSearched,
		hasExported,
		consecutivePositiveDays,
		gratitudeMentions: gratitudeCount || 0,
		growthMentions: growthCount || 0
	};
}

/**
 * Update user achievements based on action
 */
export async function updateUserAchievements(userId: string) {
	try {
		// Get current user stats
		const stats = await getUserStats(userId);

		// Get current achievements
		const userAchievements = await db
			.select()
			.from(table.userAchievement)
			.where(eq(table.userAchievement.userId, userId));

		// Calculate new achievements
		const { calculateAchievements, getRecentlyUnlocked } = await import('$lib/server/achievements');
		const newAchievements = calculateAchievements(stats);

		// Find newly unlocked achievements
		const oldAchievements = ACHIEVEMENT_DEFINITIONS.map((def) => {
			const userAch = userAchievements.find((ua) => ua.achievementId === def.id);
			return {
				...def,
				progress: userAch?.progress || 0,
				unlocked: userAch?.unlocked || false,
				unlockedAt: userAch?.unlockedAt || undefined
			};
		});

		const recentlyUnlocked = getRecentlyUnlocked(oldAchievements, newAchievements);

		// Update database
		const now = new Date();
		for (const achievement of newAchievements) {
			const existing = userAchievements.find((ua) => ua.achievementId === achievement.id);

			if (existing) {
				// Update progress
				await db
					.update(table.userAchievement)
					.set({
						progress: achievement.progress,
						unlocked: achievement.unlocked,
						unlockedAt: achievement.unlocked ? (existing.unlockedAt || now) : null,
						updatedAt: now
					})
					.where(sql`${table.userAchievement.userId} = ${userId} AND ${table.userAchievement.achievementId} = ${achievement.id}`);
			} else {
				// Insert new
				await db.insert(table.userAchievement).values({
					userId,
					achievementId: achievement.id,
					progress: achievement.progress,
					unlocked: achievement.unlocked,
					unlockedAt: achievement.unlocked ? now : null,
					createdAt: now,
					updatedAt: now
				});
			}
		}

		// Update user XP
		let totalXP = 0;
		for (const achievement of newAchievements) {
			if (achievement.unlocked) {
				const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === achievement.id);
				if (def) totalXP += def.xp;
			}
		}

		// Update user progress
		const level = calculateLevel(totalXP).level;
		await db
			.insert(table.userProgress)
			.values({
				userId,
				totalXP,
				level,
				createdAt: now,
				updatedAt: now
			})
			.onConflictDoUpdate({
				target: table.userProgress.userId,
				set: { totalXP, level, updatedAt: now }
			});

		// Return recently unlocked for notifications
		return recentlyUnlocked;
	} catch (error) {
		console.error('Error updating achievements:', error);
		return [];
	}
}