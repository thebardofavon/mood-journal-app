<script lang="ts">
	import type { PageData } from './$types';
	import { marked } from 'marked';
	import { safeHtml } from '$lib/actions/safeHtml';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let selectedTags = $state<string[]>([]);
	let selectedMood = $state('all');
	let sentimentFilter = $state<'all' | 'positive' | 'neutral' | 'negative'>('all');
	let dateOrder = $state<'desc' | 'asc'>('desc');

	// Semantic search function
	function calculateRelevance(entry: any, query: string, tags: string[]): number {
		if (!query && tags.length === 0) return 1;

		let score = 0;
		const lowerQuery = query.toLowerCase();
		const lowerContent = entry.content.toLowerCase();

		// Exact phrase match (highest weight)
		if (lowerContent.includes(lowerQuery)) {
			score += 10;
		}

		// Word matching (medium weight)
		const queryWords = lowerQuery.split(/\s+/).filter((w) => w.length > 2);
		for (const word of queryWords) {
			if (lowerContent.includes(word)) {
				score += 5;
			}
		}

		// Tag matching (high weight)
		// Note: We'd need to fetch entry tags, but for now we'll use content matching
		for (const tag of tags) {
			if (lowerContent.includes(tag.toLowerCase())) {
				score += 8;
			}
		}

		// Sentiment alignment
		if (query.includes('happy') || query.includes('joy')) {
			if (entry.sentimentScore && entry.sentimentScore > 50) score += 3;
		}
		if (query.includes('sad') || query.includes('upset')) {
			if (entry.sentimentScore && entry.sentimentScore < -30) score += 3;
		}

		return score;
	}

	const filteredEntries = $derived.by(() => {
		let results = data.entries;

		// Mood filter
		if (selectedMood !== 'all') {
			results = results.filter((e) => e.mood === selectedMood);
		}

		// Sentiment filter
		if (sentimentFilter === 'positive') {
			results = results.filter((e) => (e.sentimentScore ?? 0) > 0);
		} else if (sentimentFilter === 'negative') {
			results = results.filter((e) => (e.sentimentScore ?? 0) < 0);
		} else if (sentimentFilter === 'neutral') {
			results = results.filter((e) => (e.sentimentScore ?? 0) === 0);
		}

		// Search and tag filtering
		if (searchQuery || selectedTags.length > 0) {
			results = results
				.map((entry) => ({
					...entry,
					relevance: calculateRelevance(entry, searchQuery, selectedTags)
				}))
				.filter((entry) => entry.relevance > 0)
				.sort((a, b) => b.relevance - a.relevance);
		} else {
			// Date sorting when no search
			results = [...results].sort((a, b) => {
				const aTime = new Date(a.createdAt).getTime();
				const bTime = new Date(b.createdAt).getTime();
				return dateOrder === 'desc' ? bTime - aTime : aTime - bTime;
			});
		}

		return results;
	});

	function toggleTag(tagName: string) {
		if (selectedTags.includes(tagName)) {
			selectedTags = selectedTags.filter((t) => t !== tagName);
		} else {
			selectedTags = [...selectedTags, tagName];
		}
	}

	function clearFilters() {
		searchQuery = '';
		selectedTags = [];
		selectedMood = 'all';
		sentimentFilter = 'all';
	}

	function highlightText(text: string, query: string): string {
		if (!query) return text;
		const words = query
			.toLowerCase()
			.split(/\s+/)
			.filter((w) => w.length > 2);
		let highlighted = text;

		for (const word of words) {
			const regex = new RegExp(`(${word})`, 'gi');
			highlighted = highlighted.replace(
				regex,
				'<mark class="bg-yellow-200 dark:bg-yellow-600">$1</mark>'
			);
		}

		return highlighted;
	}

	function getSentimentEmoji(score: number | null): string {
		if (score === null) return '😐';
		if (score > 50) return '😊';
		if (score > 0) return '🙂';
		if (score === 0) return '😐';
		if (score > -50) return '😟';
		return '😢';
	}

	function formatDate(date: Date | string): string {
		return new Date(date).toLocaleDateString('en-US', {
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	const activeFilterCount = $derived(
		(selectedTags.length > 0 ? 1 : 0) +
			(selectedMood !== 'all' ? 1 : 0) +
			(sentimentFilter !== 'all' ? 1 : 0) +
			(searchQuery.length > 0 ? 1 : 0)
	);
</script>

<svelte:head>
	<title>Search Journal - Mood Journal</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-6 p-6">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">🔍 Search Your Journal</h1>
		<p class="text-gray-600 dark:text-gray-400">
			Find entries by keywords, mood, sentiment, or tags
		</p>
	</div>

	<!-- Search Box -->
	<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
		<div class="relative">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search your journal... (e.g., 'work stress', 'weekend fun', 'family dinner')"
				class="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-4 pl-12 text-lg text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
			/>
			<svg
				class="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
				/>
			</svg>
		</div>
	</div>

	<!-- Filters -->
	<div class="space-y-4 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
			{#if activeFilterCount > 0}
				<button
					onclick={clearFilters}
					class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
				>
					Clear all ({activeFilterCount})
				</button>
			{/if}
		</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<!-- Mood Filter -->
			<div>
				<label
					for="mood-select"
					class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
				>
					Mood
				</label>
				<select
					id="mood-select"
					bind:value={selectedMood}
					class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
				>
					<option value="all">All Moods</option>
					<option value="happy">😊 Happy</option>
					<option value="neutral">😐 Neutral</option>
					<option value="sad">😢 Sad</option>
					<option value="anxious">😰 Anxious</option>
					<option value="excited">🤩 Excited</option>
					<option value="calm">😌 Calm</option>
					<option value="stressed">😫 Stressed</option>
					<option value="angry">😠 Angry</option>
					<option value="other">🤔 Other</option>
				</select>
			</div>

			<!-- Sentiment Filter -->
			<div>
				<label
					for="sentiment-select"
					class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
				>
					Sentiment
				</label>
				<select
					id="sentiment-select"
					bind:value={sentimentFilter}
					class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
				>
					<option value="all">All Sentiments</option>
					<option value="positive">Positive</option>
					<option value="neutral">Neutral</option>
					<option value="negative">Negative</option>
				</select>
			</div>

			<!-- Date Order -->
			<div>
				<label
					for="date-select"
					class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
				>
					Sort By Date
				</label>
				<select
					id="date-select"
					bind:value={dateOrder}
					class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
				>
					<option value="desc">Newest First</option>
					<option value="asc">Oldest First</option>
				</select>
			</div>
		</div>

		<!-- Tag Filter -->
		{#if data.tags.length > 0}
			<div>
				<h3 class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
					Filter by Tags
				</h3>
				<div class="flex flex-wrap gap-2">
					{#each data.tags.slice(0, 20) as tag}
						<button
							onclick={() => toggleTag(tag.name)}
							class="rounded-full px-3 py-1 text-sm transition-colors {selectedTags.includes(
								tag.name
							)
								? 'bg-blue-600 text-white'
								: 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}"
							type="button"
						>
							{tag.type === 'keyword' ? '🔑' : '🏷️'}
							{tag.name}
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Results -->
	<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
				Results ({filteredEntries.length})
			</h3>
		</div>

		{#if filteredEntries.length === 0}
			<div class="py-12 text-center">
				<div class="mb-4 text-6xl">🔍</div>
				<p class="text-lg text-gray-600 dark:text-gray-400">
					{searchQuery || activeFilterCount > 0
						? 'No entries match your search'
						: 'Start searching your journal'}
				</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each filteredEntries as entry}
					<div
						class="rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md dark:border-gray-700"
					>
						<div class="mb-2 flex items-start justify-between">
							<div class="flex items-center gap-3">
								<span class="text-2xl"
									>{entry.mood === 'happy'
										? '😊'
										: entry.mood === 'sad'
											? '😢'
											: entry.mood === 'anxious'
												? '😰'
												: entry.mood === 'excited'
													? '🤩'
													: entry.mood === 'calm'
														? '😌'
														: entry.mood === 'stressed'
															? '😫'
															: entry.mood === 'angry'
																? '😠'
																: entry.mood === 'other'
																	? '🤔'
																	: '😐'}</span
								>
								<div>
									<div class="font-medium text-gray-900 dark:text-white">
										{formatDate(entry.createdAt)}
									</div>
									<div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
										<span class="capitalize">{entry.mood}</span>
										{#if entry.sentimentScore !== null}
											<span>•</span>
											<span>
												{getSentimentEmoji(entry.sentimentScore)}
												{entry.sentimentScore > 0 ? '+' : ''}{entry.sentimentScore}
											</span>
										{/if}
									</div>
								</div>
							</div>
						</div>
						<div class="prose mt-3 max-w-none dark:prose-invert">
							<div class="line-clamp-3 text-gray-700 dark:text-gray-300" use:safeHtml={highlightText(
								entry.content.substring(0, 300) + (entry.content.length > 300 ? '...' : ''),
								searchQuery
							)}>
							</div>
						</div>
						<div class="mt-3">
							<a
								href="/journal#{entry.id}"
								class="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
							>
								View full entry →
							</a>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Back Button -->
	<div>
		<a
			href="/journal"
			class="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-6 py-3 font-medium text-gray-900 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
		>
			← Back to Journal
		</a>
	</div>
</div>

<style>
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		line-clamp: 3;
		overflow: hidden;
	}
</style>
