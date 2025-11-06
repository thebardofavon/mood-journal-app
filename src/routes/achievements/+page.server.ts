import type { PageServerLoad } from './$types';
import { validateSessionToken } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
	ACHIEVEMENT_DEFINITIONS,
	calculateLevel,
	type Achievement,
	type UserProgress
} from '$lib/server/achievements';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('auth-session');
	const { user } = await validateSessionToken(token || '');
	if (!user) throw redirect(303, '/auth/login');

	try {
		// Get user progress
		const [userProgress] = await db
			.select()
			.from(table.userProgress)
			.where(eq(table.userProgress.userId, user.id))
			.limit(1);

		const progress: UserProgress = userProgress
			? {
					level: userProgress.level,
					currentXP: calculateLevel(userProgress.totalXP).currentXP,
					xpToNextLevel: calculateLevel(userProgress.totalXP).xpToNextLevel,
					totalXP: userProgress.totalXP,
					achievementsUnlocked: 0, // Will calculate below
					totalAchievements: ACHIEVEMENT_DEFINITIONS.length
				}
			: {
					level: 1,
					currentXP: 0,
					xpToNextLevel: 100,
					totalXP: 0,
					achievementsUnlocked: 0,
					totalAchievements: ACHIEVEMENT_DEFINITIONS.length
				};

		// Get user achievements
		const userAchievements = await db
			.select()
			.from(table.userAchievement)
			.where(eq(table.userAchievement.userId, user.id));

		// Build achievements list
		const achievements: Achievement[] = ACHIEVEMENT_DEFINITIONS.map((def) => {
			const userAchievement = userAchievements.find((ua) => ua.achievementId === def.id);
			return {
				...def,
				progress: userAchievement?.progress || 0,
				unlocked: userAchievement?.unlocked || false,
				unlockedAt: userAchievement?.unlockedAt || undefined
			};
		});

		progress.achievementsUnlocked = achievements.filter((a) => a.unlocked).length;

		return {
			user,
			progress,
			achievements
		};
	} catch (error) {
		console.error('Achievements load error:', error);
		return {
			user,
			progress: {
				level: 1,
				currentXP: 0,
				xpToNextLevel: 100,
				totalXP: 0,
				achievementsUnlocked: 0,
				totalAchievements: ACHIEVEMENT_DEFINITIONS.length
			},
			achievements: ACHIEVEMENT_DEFINITIONS.map((def) => ({
				...def,
				progress: 0,
				unlocked: false,
				unlockedAt: undefined
			}))
		};
	}
};
