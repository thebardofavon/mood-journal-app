/**
 * Wellness Recommendations Engine
 * Provides personalized wellness suggestions based on mood patterns and entry analysis
 */

export interface WellnessRecommendation {
	id: string;
	type: 'breathing' | 'meditation' | 'activity' | 'prompt' | 'resource' | 'insight';
	title: string;
	description: string;
	icon: string;
	duration?: string; // e.g., "5 min", "10 min"
	url?: string;
	priority: 'high' | 'medium' | 'low';
}

export interface MoodPattern {
	mood: string;
	frequency: number;
	averageSentiment: number;
	timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
	dayOfWeek?: string;
}

/**
 * Analyze mood patterns and generate personalized recommendations
 */
export function generateRecommendations(
	recentEntries: Array<{ mood: string; content: string; sentimentScore: number; createdAt: Date }>,
	moodPatterns: MoodPattern[]
): WellnessRecommendation[] {
	const recommendations: WellnessRecommendation[] = [];

	// Analyze recent sentiment trend
	const recentSentiment =
		recentEntries.slice(0, 7).reduce((sum, e) => sum + e.sentimentScore, 0) /
		Math.min(7, recentEntries.length);
	const isNegativeTrend = recentSentiment < -20;
	const isPositiveTrend = recentSentiment > 50;

	// Check for anxiety patterns
	const anxietyMentions = recentEntries.filter(
		(e) =>
			e.content.toLowerCase().includes('anxious') ||
			e.content.toLowerCase().includes('anxiety') ||
			e.content.toLowerCase().includes('worried') ||
			e.mood === 'anxious'
	).length;

	// Check for stress patterns
	const stressMentions = recentEntries.filter(
		(e) =>
			e.content.toLowerCase().includes('stress') ||
			e.content.toLowerCase().includes('overwhelm') ||
			e.content.toLowerCase().includes('pressure')
	).length;

	// Check for sadness patterns
	const sadnessMentions = recentEntries.filter(
		(e) =>
			e.mood === 'sad' ||
			e.content.toLowerCase().includes('sad') ||
			e.content.toLowerCase().includes('depressed')
	).length;

	// High Anxiety Pattern
	if (anxietyMentions >= 3) {
		recommendations.push({
			id: 'breathing-exercise-anxiety',
			type: 'breathing',
			title: '4-7-8 Breathing Technique',
			description:
				'A proven breathing exercise to quickly calm anxiety. Breathe in for 4, hold for 7, exhale for 8.',
			icon: '🫁',
			duration: '3 min',
			priority: 'high'
		});

		recommendations.push({
			id: 'grounding-5-4-3-2-1',
			type: 'activity',
			title: '5-4-3-2-1 Grounding Exercise',
			description:
				'Ground yourself in the present moment by identifying 5 things you see, 4 you touch, 3 you hear, 2 you smell, and 1 you taste.',
			icon: '🌍',
			duration: '5 min',
			priority: 'high'
		});
	}

	// High Stress Pattern
	if (stressMentions >= 3) {
		recommendations.push({
			id: 'progressive-muscle-relaxation',
			type: 'activity',
			title: 'Progressive Muscle Relaxation',
			description:
				'Systematically tense and relax muscle groups to release physical tension and mental stress.',
			icon: '💆',
			duration: '10 min',
			priority: 'high'
		});

		recommendations.push({
			id: 'time-management-prompt',
			type: 'prompt',
			title: 'Reflect on Time Management',
			description:
				'Journal prompt: What three things are causing you the most stress? Which of these can you delegate, postpone, or eliminate?',
			icon: '⏰',
			priority: 'medium'
		});
	}

	// Sadness Pattern
	if (sadnessMentions >= 3 || isNegativeTrend) {
		recommendations.push({
			id: 'gratitude-practice',
			type: 'prompt',
			title: 'Gratitude Journaling',
			description:
				"Write down three things you're grateful for today, no matter how small. Research shows this can improve mood over time.",
			icon: '🙏',
			duration: '5 min',
			priority: 'high'
		});

		recommendations.push({
			id: 'self-compassion-exercise',
			type: 'meditation',
			title: 'Self-Compassion Meditation',
			description: 'A guided meditation to treat yourself with kindness during difficult times.',
			icon: '💝',
			duration: '8 min',
			priority: 'medium'
		});

		recommendations.push({
			id: 'reach-out-reminder',
			type: 'activity',
			title: 'Connect with Someone',
			description:
				'Consider reaching out to a friend, family member, or mental health professional. Connection is powerful.',
			icon: '🤝',
			priority: 'high'
		});
	}

	// Positive Trend - Reinforce
	if (isPositiveTrend) {
		recommendations.push({
			id: 'celebrate-wins',
			type: 'prompt',
			title: 'Celebrate Your Progress',
			description:
				"You've been doing great! Reflect on what's been working well and how you can maintain this positive momentum.",
			icon: '🎉',
			priority: 'medium'
		});
	}

	// General Wellness Recommendations (always relevant)
	recommendations.push({
		id: 'mindful-breathing',
		type: 'breathing',
		title: 'Box Breathing',
		description: 'Simple 4-4-4-4 breathing pattern used by Navy SEALs to stay calm under pressure.',
		icon: '📦',
		duration: '3 min',
		priority: 'medium'
	});

	recommendations.push({
		id: 'daily-check-in',
		type: 'prompt',
		title: 'Daily Emotional Check-In',
		description:
			'How are you really feeling today? Name the emotion, notice where you feel it in your body, and accept it without judgment.',
		icon: '💭',
		duration: '3 min',
		priority: 'low'
	});

	recommendations.push({
		id: 'nature-walk',
		type: 'activity',
		title: 'Take a Nature Walk',
		description: 'Even 10 minutes in nature can significantly reduce stress and improve mood.',
		icon: '🌳',
		duration: '10 min',
		priority: 'low'
	});

	// Pattern-based insights
	const mostCommonMood = moodPatterns.sort((a, b) => b.frequency - a.frequency)[0];
	if (mostCommonMood && mostCommonMood.frequency >= 5) {
		recommendations.push({
			id: 'pattern-insight',
			type: 'insight',
			title: `Your Most Common Mood: ${mostCommonMood.mood}`,
			description: `You've felt ${mostCommonMood.mood} ${mostCommonMood.frequency} times recently. Understanding patterns is the first step to positive change.`,
			icon: '📊',
			priority: 'medium'
		});
	}

	// Sort by priority and return
	const priorityOrder = { high: 0, medium: 1, low: 2 };
	return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

/**
 * Get breathing exercises catalog
 */
export const BREATHING_EXERCISES = [
	{
		id: '4-7-8-breathing',
		name: '4-7-8 Breathing',
		description: 'Promotes relaxation and helps with anxiety',
		steps: [
			'Exhale completely through your mouth',
			'Inhale through your nose for 4 seconds',
			'Hold your breath for 7 seconds',
			'Exhale through your mouth for 8 seconds',
			'Repeat 4 times'
		],
		duration: '3-5 min',
		benefits: ['Reduces anxiety', 'Helps with sleep', 'Lowers blood pressure']
	},
	{
		id: 'box-breathing',
		name: 'Box Breathing',
		description: 'Used by Navy SEALs to stay calm',
		steps: [
			'Inhale for 4 seconds',
			'Hold for 4 seconds',
			'Exhale for 4 seconds',
			'Hold for 4 seconds',
			'Repeat 4 times'
		],
		duration: '3-5 min',
		benefits: ['Improves focus', 'Reduces stress', 'Enhances performance']
	},
	{
		id: 'alternate-nostril',
		name: 'Alternate Nostril Breathing',
		description: 'Balances the nervous system',
		steps: [
			'Close right nostril with thumb',
			'Inhale through left nostril',
			'Close left nostril, release right',
			'Exhale through right nostril',
			'Inhale through right, then switch',
			'Repeat for 5 minutes'
		],
		duration: '5-10 min',
		benefits: ['Balances emotions', 'Improves focus', 'Reduces stress']
	}
];

/**
 * Get journaling prompts catalog
 */
export const JOURNALING_PROMPTS = [
	{
		category: 'gratitude',
		prompts: [
			"What are three things you're grateful for today?",
			'Who in your life are you most grateful for and why?',
			'What small pleasure made you smile today?',
			"What's something you take for granted that you're thankful for?"
		]
	},
	{
		category: 'reflection',
		prompts: [
			'What did you learn about yourself today?',
			'What challenged you today and how did you respond?',
			'If today was a chapter in your life story, what would it be titled?',
			'What would you do differently if you could replay today?'
		]
	},
	{
		category: 'growth',
		prompts: [
			"What's one small step you can take toward your goals tomorrow?",
			'What skill would you like to develop and why?',
			'How have you grown in the past month?',
			'What fear are you ready to face?'
		]
	},
	{
		category: 'self-compassion',
		prompts: [
			'What would you say to a friend feeling the way you do?',
			'How can you be kinder to yourself today?',
			'What are three things you like about yourself?',
			'What does self-care look like for you right now?'
		]
	},
	{
		category: 'emotional',
		prompts: [
			'What emotion are you feeling right now? Where do you feel it in your body?',
			'What made you feel most alive today?',
			"What's weighing on your mind?",
			'If your feelings could speak, what would they say?'
		]
	}
];

/**
 * Get a random prompt from a specific category
 */
export function getRandomPrompt(category?: string): string {
	if (category) {
		const categoryPrompts = JOURNALING_PROMPTS.find((p) => p.category === category);
		if (categoryPrompts) {
			const randomIndex = Math.floor(Math.random() * categoryPrompts.prompts.length);
			return categoryPrompts.prompts[randomIndex];
		}
	}

	// Random from all categories
	const allPrompts = JOURNALING_PROMPTS.flatMap((p) => p.prompts);
	const randomIndex = Math.floor(Math.random() * allPrompts.length);
	return allPrompts[randomIndex];
}
