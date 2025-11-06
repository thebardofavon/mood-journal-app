import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken } from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { ACHIEVEMENT_DEFINITIONS, calculateLevel } from '$lib/server/achievements';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const token = cookies.get('auth-session');
		const { user } = await validateSessionToken(token || '');

		if (!user?.id) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { action, data } = await request.json();

		// Initialize user progress if it doesn't exist
		let [userProgress] = await db
			.select()
			.from(table.userProgress)
			.where(eq(table.userProgress.userId, user.id))
			.limit(1);

		if (!userProgress) {
			const now = new Date();
			await db.insert(table.userProgress).values({
				userId: user.id,
				totalXP: 0,
				level: 1,
				createdAt: now,
				updatedAt: now
			});
			userProgress = {
				userId: user.id,
				totalXP: 0,
				level: 1,
				createdAt: now,
				updatedAt: now
			};
		}

		let xpGained = 0;
		const unlockedAchievements: string[] = [];

		// Handle different achievement triggers
		switch (action) {
			case 'entry_created':
				xpGained = 10; // Base XP for creating an entry

				// Check milestone achievements
				await checkMilestoneAchievements(user.id);
				break;

			case 'entry_analyzed':
				xpGained = 5; // XP for AI analysis
				break;

			case 'streak_maintained':
				xpGained = 15; // Bonus XP for maintaining streaks
				await checkConsistencyAchievements(user.id, data?.streakLength);
				break;

			case 'ai_companion_used':
				xpGained = 8;
				await checkExplorationAchievements(user.id, 'ai_companion_used');
				break;

			case 'export_used':
				xpGained = 12;
				await checkExplorationAchievements(user.id, 'export_used');
				break;
		}

		// Update user XP and level
		if (xpGained > 0) {
			const newTotalXP = userProgress.totalXP + xpGained;
			const newLevel = calculateLevel(newTotalXP).level;

			await db
				.update(table.userProgress)
				.set({
					totalXP: newTotalXP,
					level: newLevel,
					updatedAt: new Date()
				})
				.where(eq(table.userProgress.userId, user.id));
		}

		return json({
			success: true,
			xpGained,
			unlockedAchievements,
			newLevel: calculateLevel(userProgress.totalXP + xpGained).level
		});
	} catch (error) {
		console.error('Achievement update error:', error);
		return json({ error: 'Failed to update achievements' }, { status: 500 });
	}
};

async function checkMilestoneAchievements(userId: string) {
	try {
		// Count total entries
		const [entryCount] = await db
			.select({ count: sql<number>`count(*)` })
			.from(table.entry)
			.where(eq(table.entry.userId, userId));

		const milestones = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
		const achievementIds = [
			'first-entry',
			'fifth-entry',
			'tenth-entry',
			'twenty-fifth-entry',
			'fiftieth-entry',
			'hundredth-entry',
			'two-hundred-fiftieth-entry',
			'five-hundredth-entry',
			'thousandth-entry'
		];

		for (let i = 0; i < milestones.length; i++) {
			if (entryCount.count >= milestones[i]) {
				await unlockAchievement(userId, achievementIds[i]);
			}
		}
	} catch (error) {
		console.error('Milestone check error:', error);
	}
}

async function checkConsistencyAchievements(userId: string, streakLength?: number) {
	// Implementation for streak-based achievements
	if (streakLength) {
		const streakAchievements = [
			{ id: 'week-streak', requirement: 7 },
			{ id: 'month-streak', requirement: 30 },
			{ id: 'quarter-streak', requirement: 90 },
			{ id: 'year-streak', requirement: 365 }
		];

		for (const achievement of streakAchievements) {
			if (streakLength >= achievement.requirement) {
				await unlockAchievement(userId, achievement.id);
			}
		}
	}
}

async function checkExplorationAchievements(userId: string, action: string) {
	const achievementMap: Record<string, string> = {
		ai_companion_used: 'ai-companion-used',
		export_used: 'first-export'
	};

	const achievementId = achievementMap[action];
	if (achievementId) {
		await unlockAchievement(userId, achievementId);
	}
}

async function unlockAchievement(userId: string, achievementId: string) {
	try {
		const achievement = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === achievementId);
		if (!achievement) return;

		// Check if already unlocked
		const [existing] = await db
			.select()
			.from(table.userAchievement)
			.where(
				sql`${table.userAchievement.userId} = ${userId} AND ${table.userAchievement.achievementId} = ${achievementId}`
			)
			.limit(1);

		if (existing?.unlocked) return;

		const now = new Date();

		if (existing) {
			// Update existing record
			await db
				.update(table.userAchievement)
				.set({
					unlocked: true,
					unlockedAt: now,
					updatedAt: now
				})
				.where(
					sql`${table.userAchievement.userId} = ${userId} AND ${table.userAchievement.achievementId} = ${achievementId}`
				);
		} else {
			// Create new record
			await db.insert(table.userAchievement).values({
				userId,
				achievementId,
				progress: achievement.requirement,
				unlocked: true,
				unlockedAt: now,
				createdAt: now,
				updatedAt: now
			});
		}

		// Award XP
		const [userProgress] = await db
			.select()
			.from(table.userProgress)
			.where(eq(table.userProgress.userId, userId))
			.limit(1);

		if (userProgress) {
			const newTotalXP = userProgress.totalXP + achievement.xp;
			const newLevel = calculateLevel(newTotalXP).level;

			await db
				.update(table.userProgress)
				.set({
					totalXP: newTotalXP,
					level: newLevel,
					updatedAt: now
				})
				.where(eq(table.userProgress.userId, userId));
		}
	} catch (error) {
		console.error('Unlock achievement error:', error);
	}
}
