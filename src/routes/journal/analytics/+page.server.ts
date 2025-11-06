import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { entry } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';

type EntryData = {
	id: string;
	mood: string;
	sentimentScore: number | null;
	sentimentLabel: string | null;
	createdAt: Date;
};

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(303, '/auth/login');
	}

	// Get entries from the last 90 days
	const ninetyDaysAgo = new Date();
	ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

	const entries = await db
		.select({
			id: entry.id,
			mood: entry.mood,
			sentimentScore: entry.sentimentScore,
			sentimentLabel: entry.sentimentLabel,
			createdAt: entry.createdAt
		})
		.from(entry)
		.where(eq(entry.userId, user.id))
		.orderBy(desc(entry.createdAt));

	// Calculate statistics
	const totalEntries = entries.length;
	const entriesLast30Days = entries.filter((e) => {
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		return e.createdAt >= thirtyDaysAgo;
	}).length;

	const avgSentiment =
		entries.length > 0
			? entries.reduce((sum, e) => sum + (e.sentimentScore || 0), 0) / entries.length
			: 0;

	// Mood distribution
	const moodCounts = entries.reduce(
		(acc, e) => {
			acc[e.mood] = (acc[e.mood] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	);

	// Sentiment distribution
	const sentimentCounts = entries.reduce(
		(acc, e) => {
			const label = e.sentimentLabel || 'NEUTRAL';
			acc[label] = (acc[label] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	);

	// Get longest streak
	let currentStreak = 0;
	let longestStreak = 0;
	const sortedDates = entries
		.map((e) => e.createdAt.toISOString().split('T')[0])
		.filter((date, index, self) => self.indexOf(date) === index)
		.sort()
		.reverse();

	for (let i = 0; i < sortedDates.length; i++) {
		if (i === 0) {
			currentStreak = 1;
		} else {
			const prevDate = new Date(sortedDates[i - 1]);
			const currDate = new Date(sortedDates[i]);
			const diffDays = Math.floor(
				(prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
			);

			if (diffDays === 1) {
				currentStreak++;
			} else {
				if (currentStreak > longestStreak) {
					longestStreak = currentStreak;
				}
				currentStreak = 1;
			}
		}
	}
	if (currentStreak > longestStreak) {
		longestStreak = currentStreak;
	}

	// Check if user journaled today
	const today = new Date().toISOString().split('T')[0];
	const journaledToday = sortedDates.length > 0 && sortedDates[0] === today;
	const activeStreak = journaledToday ? currentStreak : 0;

	// Predictive insights - analyze patterns
	const insights = analyzePredictivePatterns(entries);

	// Prepare chart data
	const chartData = entries.map((e) => ({
		date: e.createdAt,
		sentimentScore: e.sentimentScore || 0,
		mood: e.mood
	}));

	return {
		statistics: {
			totalEntries,
			entriesLast30Days,
			avgSentiment: Math.round(avgSentiment),
			longestStreak,
			activeStreak,
			moodCounts,
			sentimentCounts
		},
		chartData,
		insights
	};
};

// Analyze patterns for predictions
function analyzePredictivePatterns(entries: EntryData[]) {
	const insights = {
		dayOfWeekPattern: {} as Record<string, { avgSentiment: number; count: number }>,
		timeOfDayPattern: {} as Record<string, { avgSentiment: number; count: number }>,
		trendDirection: '',
		forecast: '',
		recommendations: [] as string[]
	};

	// Day of week analysis
	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	entries.forEach((entry) => {
		const date = new Date(entry.createdAt);
		const dayName = days[date.getDay()];
		if (!insights.dayOfWeekPattern[dayName]) {
			insights.dayOfWeekPattern[dayName] = { avgSentiment: 0, count: 0 };
		}
		insights.dayOfWeekPattern[dayName].avgSentiment += entry.sentimentScore || 0;
		insights.dayOfWeekPattern[dayName].count += 1;
	});

	// Calculate averages
	Object.keys(insights.dayOfWeekPattern).forEach((day) => {
		const data = insights.dayOfWeekPattern[day];
		data.avgSentiment = data.avgSentiment / data.count;
	});

	// Time of day analysis
	entries.forEach((entry) => {
		const date = new Date(entry.createdAt);
		const hour = date.getHours();
		let timeOfDay = '';
		if (hour >= 5 && hour < 12) timeOfDay = 'Morning';
		else if (hour >= 12 && hour < 17) timeOfDay = 'Afternoon';
		else if (hour >= 17 && hour < 21) timeOfDay = 'Evening';
		else timeOfDay = 'Night';

		if (!insights.timeOfDayPattern[timeOfDay]) {
			insights.timeOfDayPattern[timeOfDay] = { avgSentiment: 0, count: 0 };
		}
		insights.timeOfDayPattern[timeOfDay].avgSentiment += entry.sentimentScore || 0;
		insights.timeOfDayPattern[timeOfDay].count += 1;
	});

	// Calculate time averages
	Object.keys(insights.timeOfDayPattern).forEach((time) => {
		const data = insights.timeOfDayPattern[time];
		data.avgSentiment = data.avgSentiment / data.count;
	});

	// Trend direction (last 7 days vs previous 7 days)
	if (entries.length >= 14) {
		const last7 = entries.slice(0, 7);
		const prev7 = entries.slice(7, 14);
		const last7Avg = last7.reduce((sum, e) => sum + (e.sentimentScore || 0), 0) / 7;
		const prev7Avg = prev7.reduce((sum, e) => sum + (e.sentimentScore || 0), 0) / 7;

		if (last7Avg > prev7Avg + 10) {
			insights.trendDirection = 'improving';
			insights.forecast = 'Your mood has been improving lately. Keep up the positive momentum!';
		} else if (last7Avg < prev7Avg - 10) {
			insights.trendDirection = 'declining';
			insights.forecast =
				'Your mood seems to be dipping. Consider self-care activities or reaching out for support.';
		} else {
			insights.trendDirection = 'stable';
			insights.forecast = 'Your mood has been stable. Consistency is great!';
		}
	}

	// Generate recommendations
	const worstDay = Object.entries(insights.dayOfWeekPattern).sort(
		(a, b) => a[1].avgSentiment - b[1].avgSentiment
	)[0];
	const bestDay = Object.entries(insights.dayOfWeekPattern).sort(
		(a, b) => b[1].avgSentiment - a[1].avgSentiment
	)[0];

	if (worstDay && worstDay[1].avgSentiment < -20) {
		insights.recommendations.push(
			`${worstDay[0]}s tend to be challenging. Plan something enjoyable or relaxing.`
		);
	}
	if (bestDay && bestDay[1].avgSentiment > 30) {
		insights.recommendations.push(
			`${bestDay[0]}s are your best days! Use this energy for important tasks.`
		);
	}

	const worstTime = Object.entries(insights.timeOfDayPattern).sort(
		(a, b) => a[1].avgSentiment - b[1].avgSentiment
	)[0];
	if (worstTime && worstTime[1].avgSentiment < -10) {
		insights.recommendations.push(
			`${worstTime[0]} seems difficult. Try scheduling breaks or pleasant activities then.`
		);
	}

	return insights;
}
