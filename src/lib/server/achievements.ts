/**
 * Achievements System
 * Gamification layer for the Mood Journal app
 */

export interface Achievement {
	id: string;
	title: string;
	description: string;
	icon: string;
	category: 'milestone' | 'consistency' | 'quality' | 'exploration' | 'wellness';
	requirement: number;
	progress: number;
	unlocked: boolean;
	unlockedAt?: Date;
	xp: number;
}

export interface UserProgress {
	level: number;
	currentXP: number;
	xpToNextLevel: number;
	totalXP: number;
	achievementsUnlocked: number;
	totalAchievements: number;
}

// XP Formula: Level N requires N * 100 XP
export function calculateLevel(totalXP: number): {
	level: number;
	currentXP: number;
	xpToNextLevel: number;
} {
	let level = 1;
	let xpForCurrentLevel = 0;

	while (totalXP >= xpForCurrentLevel + level * 100) {
		xpForCurrentLevel += level * 100;
		level++;
	}

	const currentXP = totalXP - xpForCurrentLevel;
	const xpToNextLevel = level * 100 - currentXP;

	return { level, currentXP, xpToNextLevel };
}

// Achievement definitions
export const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'progress' | 'unlocked' | 'unlockedAt'>[] =
	[
		// Milestone Achievements
		{
			id: 'first-entry',
			title: 'First Steps',
			description: 'Created your first journal entry',
			icon: '🌱',
			category: 'milestone',
			requirement: 1,
			xp: 50
		},
		{
			id: 'entries-10',
			title: 'Getting Started',
			description: 'Created 10 journal entries',
			icon: '📝',
			category: 'milestone',
			requirement: 10,
			xp: 100
		},
		{
			id: 'entries-50',
			title: 'Dedicated Journaler',
			description: 'Created 50 journal entries',
			icon: '📚',
			category: 'milestone',
			requirement: 50,
			xp: 500
		},
		{
			id: 'entries-100',
			title: 'Century Club',
			description: 'Created 100 journal entries',
			icon: '🏆',
			category: 'milestone',
			requirement: 100,
			xp: 1000
		},
		{
			id: 'entries-365',
			title: 'Year of Reflection',
			description: 'Created 365 journal entries',
			icon: '⭐',
			category: 'milestone',
			requirement: 365,
			xp: 3650
		},

		// Consistency Achievements
		{
			id: 'streak-7',
			title: 'Weekly Warrior',
			description: 'Maintained a 7-day journaling streak',
			icon: '🔥',
			category: 'consistency',
			requirement: 7,
			xp: 200
		},
		{
			id: 'streak-30',
			title: 'Monthly Master',
			description: 'Maintained a 30-day journaling streak',
			icon: '💪',
			category: 'consistency',
			requirement: 30,
			xp: 1000
		},
		{
			id: 'streak-100',
			title: 'Unstoppable',
			description: 'Maintained a 100-day journaling streak',
			icon: '🚀',
			category: 'consistency',
			requirement: 100,
			xp: 5000
		},
		{
			id: 'streak-365',
			title: 'Full Year Streak',
			description: 'Maintained a 365-day journaling streak',
			icon: '👑',
			category: 'consistency',
			requirement: 365,
			xp: 10000
		},

		// Quality Achievements
		{
			id: 'words-500',
			title: 'Wordsmith',
			description: 'Wrote an entry with 500+ words',
			icon: '✍️',
			category: 'quality',
			requirement: 500,
			xp: 150
		},
		{
			id: 'words-1000',
			title: 'Deep Thinker',
			description: 'Wrote an entry with 1000+ words',
			icon: '🧠',
			category: 'quality',
			requirement: 1000,
			xp: 300
		},
		{
			id: 'first-photo',
			title: 'Picture Perfect',
			description: 'Added your first photo to an entry',
			icon: '📸',
			category: 'quality',
			requirement: 1,
			xp: 100
		},
		{
			id: 'voice-journal',
			title: 'Voice of Mind',
			description: 'Created your first voice journal entry',
			icon: '🎙️',
			category: 'quality',
			requirement: 1,
			xp: 200
		},

		// Exploration Achievements
		{
			id: 'ai-companion-first',
			title: 'AI Friend',
			description: 'Had your first conversation with the AI companion',
			icon: '🤖',
			category: 'exploration',
			requirement: 1,
			xp: 100
		},
		{
			id: 'analytics-viewed',
			title: 'Data Explorer',
			description: 'Viewed your analytics dashboard',
			icon: '📊',
			category: 'exploration',
			requirement: 1,
			xp: 50
		},
		{
			id: 'search-used',
			title: 'Memory Lane',
			description: 'Searched through your past entries',
			icon: '🔍',
			category: 'exploration',
			requirement: 1,
			xp: 50
		},
		{
			id: 'export-journal',
			title: 'Archivist',
			description: 'Exported your journal',
			icon: '💾',
			category: 'exploration',
			requirement: 1,
			xp: 100
		},

		// Wellness Achievements
		{
			id: 'positive-week',
			title: 'Sunny Week',
			description: 'Had 7 consecutive positive-sentiment entries',
			icon: '☀️',
			category: 'wellness',
			requirement: 7,
			xp: 500
		},
		{
			id: 'reflection-master',
			title: 'Self-Aware',
			description: 'Reflected on a difficult emotion',
			icon: '🌟',
			category: 'wellness',
			requirement: 1,
			xp: 200
		},
		{
			id: 'gratitude-habit',
			title: 'Grateful Heart',
			description: 'Mentioned gratitude in 10 entries',
			icon: '🙏',
			category: 'wellness',
			requirement: 10,
			xp: 300
		},
		{
			id: 'growth-mindset',
			title: 'Growth Mindset',
			description: 'Documented personal growth or learning',
			icon: '🌱',
			category: 'wellness',
			requirement: 5,
			xp: 400
		}
	];

/**
 * Check if user has unlocked a specific achievement
 */
export function checkAchievement(achievementId: string, currentProgress: number): boolean {
	const definition = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === achievementId);
	if (!definition) return false;
	return currentProgress >= definition.requirement;
}

/**
 * Calculate all achievements based on user stats
 */
export function calculateAchievements(stats: {
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
}): Achievement[] {
	return ACHIEVEMENT_DEFINITIONS.map((def) => {
		let progress = 0;
		let unlocked = false;

		switch (def.id) {
			// Milestones
			case 'first-entry':
			case 'entries-10':
			case 'entries-50':
			case 'entries-100':
			case 'entries-365':
				progress = stats.totalEntries;
				break;

			// Streaks
			case 'streak-7':
			case 'streak-30':
			case 'streak-100':
			case 'streak-365':
				progress = Math.max(stats.longestStreak, stats.currentStreak);
				break;

			// Quality
			case 'words-500':
			case 'words-1000':
				progress = stats.maxWordCount;
				break;
			case 'first-photo':
				progress = stats.hasPhotos ? 1 : 0;
				break;
			case 'voice-journal':
				progress = stats.hasVoiceEntries ? 1 : 0;
				break;

			// Exploration
			case 'ai-companion-first':
				progress = stats.hasUsedAI ? 1 : 0;
				break;
			case 'analytics-viewed':
				progress = stats.hasViewedAnalytics ? 1 : 0;
				break;
			case 'search-used':
				progress = stats.hasSearched ? 1 : 0;
				break;
			case 'export-journal':
				progress = stats.hasExported ? 1 : 0;
				break;

			// Wellness
			case 'positive-week':
				progress = stats.consecutivePositiveDays;
				break;
			case 'reflection-master':
				progress = 1; // This would need manual tracking
				break;
			case 'gratitude-habit':
				progress = stats.gratitudeMentions;
				break;
			case 'growth-mindset':
				progress = stats.growthMentions;
				break;
		}

		unlocked = progress >= def.requirement;

		return {
			...def,
			progress,
			unlocked,
			unlockedAt: unlocked ? new Date() : undefined
		};
	});
}

/**
 * Get recently unlocked achievements (for notifications)
 */
export function getRecentlyUnlocked(
	oldAchievements: Achievement[],
	newAchievements: Achievement[]
): Achievement[] {
	return newAchievements.filter((newAch, idx) => {
		const oldAch = oldAchievements[idx];
		return newAch.unlocked && !oldAch.unlocked;
	});
}
