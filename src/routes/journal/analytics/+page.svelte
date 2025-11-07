<script lang="ts">
	import type { PageData } from './$types';
	import MoodTrendsChart from '$lib/components/charts/MoodTrendsChart.svelte';

	let { data }: { data: PageData } = $props();

	let timeRange = $state<'daily' | 'weekly' | 'monthly'>('daily');
	let chartType = $state<'line' | 'bar'>('line');

	const stats = data.statistics;

	function getSentimentEmoji(score: number): string {
		if (score > 50) return '😊';
		if (score > 0) return '🙂';
		if (score === 0) return '😐';
		if (score > -50) return '😟';
		return '😢';
	}

	function getSentimentColor(score: number): string {
		if (score > 50) return 'text-green-600';
		if (score > 0) return 'text-green-400';
		if (score === 0) return 'text-gray-600';
		if (score > -50) return 'text-orange-500';
		return 'text-red-600';
	}
</script>

<svelte:head>
	<title>Analytics & Insights - Mood Journal</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8 p-6">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Analytics & Insights</h1>
		<p class="text-gray-600 dark:text-gray-400">
			Understand your emotional patterns and track your wellness journey
		</p>
	</div>

	<!-- Statistics Cards -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
		<!-- Total Entries -->
		<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
			<div class="mb-2 flex items-center justify-between">
				<h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Entries</h3>
				<span class="text-2xl">📝</span>
			</div>
			<p class="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalEntries}</p>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-500">
				{stats.entriesLast30Days} in last 30 days
			</p>
		</div>

		<!-- Average Sentiment -->
		<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
			<div class="mb-2 flex items-center justify-between">
				<h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Sentiment</h3>
				<span class="text-2xl">{getSentimentEmoji(stats.avgSentiment)}</span>
			</div>
			<p class="text-3xl font-bold {getSentimentColor(stats.avgSentiment)}">
				{stats.avgSentiment > 0 ? '+' : ''}{stats.avgSentiment}
			</p>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-500">
				{stats.avgSentiment > 50
					? 'Very positive'
					: stats.avgSentiment > 0
						? 'Positive'
						: stats.avgSentiment === 0
							? 'Neutral'
							: stats.avgSentiment > -50
								? 'Negative'
								: 'Very negative'}
			</p>
		</div>

		<!-- Current Streak -->
		<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
			<div class="mb-2 flex items-center justify-between">
				<h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">Current Streak</h3>
				<span class="text-2xl">🔥</span>
			</div>
			<p class="text-3xl font-bold text-orange-600">{stats.activeStreak}</p>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-500">
				{stats.activeStreak === 1 ? 'day' : 'days'} in a row
			</p>
		</div>

		<!-- Longest Streak -->
		<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
			<div class="mb-2 flex items-center justify-between">
				<h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">Best Streak</h3>
				<span class="text-2xl">🏆</span>
			</div>
			<p class="text-3xl font-bold text-purple-600">{stats.longestStreak}</p>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-500">Personal record</p>
		</div>
	</div>

	<!-- Mood Trends Chart -->
	<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
		<div class="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
			<h2 class="text-xl font-bold text-gray-900 dark:text-white">Mood Trends Over Time</h2>

			<div class="flex flex-wrap gap-2">
				<!-- Time Range Selector -->
				<div class="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
					<button
						onclick={() => (timeRange = 'daily')}
						class="rounded px-3 py-1 text-sm font-medium transition-colors {timeRange === 'daily'
							? 'bg-white text-blue-600 shadow dark:bg-gray-600 dark:text-blue-400'
							: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}"
					>
						Daily
					</button>
					<button
						onclick={() => (timeRange = 'weekly')}
						class="rounded px-3 py-1 text-sm font-medium transition-colors {timeRange === 'weekly'
							? 'bg-white text-blue-600 shadow dark:bg-gray-600 dark:text-blue-400'
							: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}"
					>
						Weekly
					</button>
					<button
						onclick={() => (timeRange = 'monthly')}
						class="rounded px-3 py-1 text-sm font-medium transition-colors {timeRange === 'monthly'
							? 'bg-white text-blue-600 shadow dark:bg-gray-600 dark:text-blue-400'
							: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}"
					>
						Monthly
					</button>
				</div>

				<!-- Chart Type Selector -->
				<div class="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
					<button
						onclick={() => (chartType = 'line')}
						class="rounded px-3 py-1 text-sm font-medium transition-colors {chartType === 'line'
							? 'bg-white text-blue-600 shadow dark:bg-gray-600 dark:text-blue-400'
							: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}"
					>
						Line
					</button>
					<button
						onclick={() => (chartType = 'bar')}
						class="rounded px-3 py-1 text-sm font-medium transition-colors {chartType === 'bar'
							? 'bg-white text-blue-600 shadow dark:bg-gray-600 dark:text-blue-400'
							: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}"
					>
						Bar
					</button>
				</div>
			</div>
		</div>

		<MoodTrendsChart data={data.chartData} {timeRange} {chartType} />
	</div>

	<!-- Mood & Sentiment Distribution -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Mood Distribution -->
		<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
			<h2 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">Mood Distribution</h2>
			<div class="space-y-3">
				{#each Object.entries(stats.moodCounts).sort((a, b) => b[1] - a[1]) as [mood, count]}
					{@const percentage = ((count / stats.totalEntries) * 100).toFixed(1)}
					<div>
						<div class="mb-1 flex items-center justify-between">
							<span class="text-sm font-medium text-gray-700 capitalize dark:text-gray-300">
								{mood}
							</span>
							<span class="text-sm text-gray-500 dark:text-gray-400">
								{count} ({percentage}%)
							</span>
						</div>
						<div class="bg-secondary h-2 w-full rounded-full">
							<div
								class="bg-primary h-2 rounded-full transition-all"
								style="width: {percentage}%"
							></div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Sentiment Distribution -->
		<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
			<h2 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">Sentiment Analysis</h2>
			<div class="space-y-3">
				{#each Object.entries(stats.sentimentCounts).sort((a, b) => b[1] - a[1]) as [sentiment, count]}
					{@const percentage = ((count / stats.totalEntries) * 100).toFixed(1)}
					{@const color =
						sentiment === 'POSITIVE'
							? 'bg-foreground/90'
							: sentiment === 'NEGATIVE'
								? 'bg-muted-foreground'
								: 'bg-muted-foreground/50'}
					<div>
						<div class="mb-1 flex items-center justify-between">
							<span class="text-sm font-medium text-gray-700 capitalize dark:text-gray-300">
								{sentiment.toLowerCase()}
								{sentiment === 'POSITIVE' ? '😊' : sentiment === 'NEGATIVE' ? '😢' : '😐'}
							</span>
							<span class="text-sm text-gray-500 dark:text-gray-400">
								{count} ({percentage}%)
							</span>
						</div>
						<div class="bg-secondary h-2 w-full rounded-full">
							<div
								class="{color} h-2 rounded-full transition-all"
								style="width: {percentage}%"
							></div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Insights Section -->
	<div class="bg-muted/50 rounded-lg p-6 shadow">
		<h2 class="mb-4 text-xl font-bold">💡 Personalized Insights</h2>
		<div class="space-y-3">
			{#if stats.totalEntries === 0}
				<div class="flex items-start gap-3">
					<span class="text-2xl">🌱</span>
					<div>
						<p class="font-medium text-gray-900 dark:text-white">Just getting started</p>
						<p class="text-sm text-gray-600 dark:text-gray-400">
							You're building a great habit! Try to journal regularly to unlock deeper insights
							about your emotional patterns.
						</p>
					</div>
				</div>
			{:else}
				{#if stats.activeStreak >= 7}
				<div class="flex items-start gap-3">
					<span class="text-2xl">🎉</span>
					<div>
						<p class="font-medium text-gray-900 dark:text-white">Amazing streak!</p>
						<p class="text-sm text-gray-600 dark:text-gray-400">
							You've been journaling consistently for {stats.activeStreak} days. Keep up the great work!
						</p>
					</div>
				</div>
			{/if}

			{#if stats.avgSentiment > 50}
				<div class="flex items-start gap-3">
					<span class="text-2xl">🌟</span>
					<div>
						<p class="font-medium text-gray-900 dark:text-white">Very positive outlook</p>
						<p class="text-sm text-gray-600 dark:text-gray-400">
							Your recent entries show a very positive sentiment. You're doing great!
						</p>
					</div>
				</div>
			{:else if stats.avgSentiment < -30}
				<div class="flex items-start gap-3">
					<span class="text-2xl">💙</span>
					<div>
						<p class="font-medium text-gray-900 dark:text-white">We notice tough times</p>
						<p class="text-sm text-gray-600 dark:text-gray-400">
							Your entries suggest you might be going through a challenging period. Remember, it's
							okay to seek support.
						</p>
					</div>
				</div>
			{/if}

			{#if stats.entriesLast30Days > 20}
				<div class="flex items-start gap-3">
					<span class="text-2xl">📈</span>
					<div>
						<p class="font-medium text-gray-900 dark:text-white">Highly engaged</p>
						<p class="text-sm text-gray-600 dark:text-gray-400">
							You've journaled {stats.entriesLast30Days} times in the last month. Self-reflection is
							a powerful habit!
						</p>
					</div>
				</div>
			{:else if stats.entriesLast30Days >= 10}
				<div class="flex items-start gap-3">
					<span class="text-2xl">✨</span>
					<div>
						<p class="font-medium text-gray-900 dark:text-white">Building momentum</p>
						<p class="text-sm text-gray-600 dark:text-gray-400">
							{stats.entriesLast30Days} entries in the past month. You're developing a consistent journaling habit!
						</p>
					</div>
				</div>
			{:else if stats.totalEntries >= 5}
				<div class="flex items-start gap-3">
					<span class="text-2xl">📝</span>
					<div>
						<p class="font-medium text-gray-900 dark:text-white">Making progress</p>
						<p class="text-sm text-gray-600 dark:text-gray-400">
							You have {stats.totalEntries} journal entries. Keep going to discover more patterns in your emotional journey!
						</p>
					</div>
				</div>
			{/if}

			{#if stats.avgSentiment >= -10 && stats.avgSentiment <= 10 && stats.totalEntries >= 5}
				<div class="flex items-start gap-3">
					<span class="text-2xl">⚖️</span>
					<div>
						<p class="font-medium text-gray-900 dark:text-white">Balanced emotions</p>
						<p class="text-sm text-gray-600 dark:text-gray-400">
							Your entries show a balanced emotional state. You're experiencing a mix of different feelings.
						</p>
					</div>
				</div>
			{/if}

			{#if stats.totalEntries < 5 && stats.totalEntries > 0}
				<div class="flex items-start gap-3">
					<span class="text-2xl">🌱</span>
					<div>
						<p class="font-medium text-gray-900 dark:text-white">Just getting started</p>
						<p class="text-sm text-gray-600 dark:text-gray-400">
							You're building a great habit! Try to journal regularly to unlock deeper insights
							about your emotional patterns.
						</p>
					</div>
				</div>
			{/if}
			{/if}
		</div>
	</div>

	<!-- Predictive Insights -->
	{#if data.insights && stats.totalEntries >= 5}
		<div class="bg-muted/50 rounded-lg p-6 shadow">
			<h2 class="mb-4 text-xl font-bold">🔮 Predictive Insights</h2>

			{#if Object.keys(data.insights.dayOfWeekPattern).length === 0 && Object.keys(data.insights.timeOfDayPattern).length === 0 && !data.insights.forecast}
				<div class="flex items-start gap-3">
					<span class="text-2xl">📊</span>
					<div>
						<p class="font-medium text-gray-900 dark:text-white">Building your patterns</p>
						<p class="text-sm text-gray-600 dark:text-gray-400">
							Keep journaling to discover patterns in your mood based on the day of the week and time
							of day. We need at least 14 entries to show meaningful predictions.
						</p>
					</div>
				</div>
			{:else}
				{#if data.insights.forecast}
				<div class="bg-background/50 mb-6 rounded-lg p-4">
					<div class="flex items-start gap-3">
						<span class="text-3xl">
							{data.insights.trendDirection === 'improving'
								? '📈'
								: data.insights.trendDirection === 'declining'
									? '📉'
									: '📊'}
						</span>
						<div>
							<p class="mb-1 font-medium">Mood Trend</p>
							<p class="text-muted-foreground text-sm">{data.insights.forecast}</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Day of Week Patterns -->
			{#if Object.keys(data.insights.dayOfWeekPattern).length > 0}
				<div class="mb-6">
					<h3 class="mb-3 font-semibold">📅 Day of Week Patterns</h3>
					<div class="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
						{#each ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as day}
							{@const dayData = data.insights.dayOfWeekPattern[day]}
							{#if dayData}
								{@const sentiment = Math.round(dayData.avgSentiment)}
								{@const color =
									sentiment > 30
										? 'bg-accent border-border'
										: sentiment < -30
											? 'bg-muted border-border'
											: 'bg-secondary border-border'}
								<div class="rounded-lg p-3 {color} border text-center">
									<div class="mb-1 text-xs font-medium">{day.slice(0, 3)}</div>
									<div class="text-lg font-bold">{sentiment > 0 ? '+' : ''}{sentiment}</div>
									<div class="text-muted-foreground text-xs">{dayData.count} entries</div>
								</div>
							{/if}
						{/each}
					</div>
				</div>
			{/if}

			<!-- Time of Day Patterns -->
			{#if Object.keys(data.insights.timeOfDayPattern).length > 0}
				<div class="mb-6">
					<h3 class="mb-3 font-semibold">🕐 Time of Day Patterns</h3>
					<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
						{#each ['Morning', 'Afternoon', 'Evening', 'Night'] as time}
							{@const timeData = data.insights.timeOfDayPattern[time]}
							{#if timeData}
								{@const sentiment = Math.round(timeData.avgSentiment)}
								{@const emoji =
									time === 'Morning'
										? '🌅'
										: time === 'Afternoon'
											? '☀️'
											: time === 'Evening'
												? '🌆'
												: '🌙'}
								{@const color =
									sentiment > 20
										? 'bg-accent border-border'
										: sentiment < -20
											? 'bg-muted border-border'
											: 'bg-secondary border-border'}
								<div class="rounded-lg border-2 p-4 {color}">
									<div class="mb-2 flex items-center gap-2">
										<span class="text-2xl">{emoji}</span>
										<span class="font-medium">{time}</span>
									</div>
									<div class="text-2xl font-bold">
										{sentiment > 0 ? '+' : ''}{sentiment}
									</div>
									<div class="text-muted-foreground mt-1 text-xs">{timeData.count} entries</div>
								</div>
							{/if}
						{/each}
					</div>
				</div>
			{/if}

			<!-- Recommendations -->
			{#if data.insights.recommendations.length > 0}
				<div>
					<h3 class="mb-3 font-semibold">💭 Recommendations</h3>
					<div class="space-y-2">
						{#each data.insights.recommendations as recommendation}
							<div class="bg-background/50 flex items-start gap-2 rounded-lg p-3">
								<span class="text-lg">💡</span>
								<p class="text-muted-foreground text-sm">{recommendation}</p>
							</div>
						{/each}
					</div>
				</div>
			{/if}
			{/if}
		</div>
	{/if}

	<!-- Quick Actions -->
	<div class="flex justify-center gap-4">
		<a
			href="/journal"
			class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-3 font-medium transition-colors"
		>
			Write New Entry
		</a>
		<a
			href="/journal/export"
			class="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg px-6 py-3 font-medium transition-colors"
		>
			Export Journal
		</a>
	</div>
</div>
