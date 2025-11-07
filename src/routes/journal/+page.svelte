<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import PullToRefresh from '$lib/components/PullToRefresh.svelte';

	let { data } = $props();

	function getMoodEmoji(mood: string) {
		const emojis: Record<string, string> = {
			happy: '😊',
			neutral: '😐',
			sad: '😢',
			anxious: '😰',
			excited: '🤩',
			calm: '😌',
			stressed: '😫',
			angry: '😠',
			other: '🤔'
		};
		return emojis[mood] || '😐';
	}

	function getSentimentEmoji(score: number): string {
		if (score > 50) return '😊';
		if (score > 0) return '🙂';
		if (score === 0) return '😐';
		if (score > -50) return '😟';
		return '😢';
	}

	function formatRelativeTime(date: Date | string) {
		const now = new Date();
		const entryDate = new Date(date);
		const diffMs = now.getTime() - entryDate.getTime();
		const diffMinutes = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffMinutes < 1) return 'Just now';
		if (diffMinutes < 60) return `${diffMinutes}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;

		return entryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	let searchQuery = $state(data.filters.search);
	let moodFilter = $state(data.filters.mood);
	let tagFilter = $state(data.filters.tag);

	function updateFilters() {
		const params = new URLSearchParams($page.url.searchParams);
		if (searchQuery) {
			params.set('q', searchQuery);
		} else {
			params.delete('q');
		}
		if (moodFilter !== 'all') {
			params.set('mood', moodFilter);
		} else {
			params.delete('mood');
		}
		if (tagFilter) {
			params.set('tag', tagFilter);
		} else {
			params.delete('tag');
		}
		params.delete('page'); // Reset to page 1 when filters change
		goto(`?${params.toString()}`);
	}

	function goToPage(pageNum: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', pageNum.toString());
		goto(`?${params.toString()}`);
	}

	async function handleRefresh() {
		// Reload the current page data
		await goto($page.url.pathname + $page.url.search, { invalidateAll: true });
	}
</script>

<svelte:head>
	<title>Journal | Mood Journal</title>
</svelte:head>

<div class="bg-background min-h-screen">
	<div class="mx-auto max-w-6xl px-4 py-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="mb-6 flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Journal</h1>
					<p class="mt-2 text-gray-600 dark:text-gray-400">
						{data.pagination.totalEntries}
						{data.pagination.totalEntries === 1 ? 'entry' : 'entries'}
					</p>
				</div>
				<div class="flex gap-3">
					<a
						href="/journal/analytics"
						class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
					>
						<span>📊</span>
						<span class="hidden sm:inline">Analytics</span>
					</a>
					<a
						href="/journal/search"
						class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
					>
						<span>🔍</span>
						<span class="hidden sm:inline">Search</span>
					</a>
					<a
						href="/journal/new"
						class="flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-2 font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
					>
						<span>+</span>
						<span>New Entry</span>
					</a>
				</div>
			</div>

			<!-- Filters -->
			<div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
				<div class="flex flex-col gap-4 sm:flex-row">
					<!-- Search -->
					<div class="flex-1">
						<input
							type="text"
							bind:value={searchQuery}
							onkeydown={(e) => e.key === 'Enter' && updateFilters()}
							placeholder="Search entries..."
							class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-white"
						/>
					</div>

					<!-- Mood Filter -->
					<div class="flex flex-wrap gap-2">
						<button
							onclick={() => {
								moodFilter = 'all';
								updateFilters();
							}}
							class="rounded-lg border px-4 py-2 transition-all {moodFilter === 'all'
								? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
								: 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600'}"
						>
							All
						</button>
						{#each ['happy', 'neutral', 'sad', 'anxious', 'excited', 'calm', 'stressed', 'angry', 'other'] as mood}
							<button
								onclick={() => {
									moodFilter = mood;
									updateFilters();
								}}
								class="rounded-lg border px-3 py-2 transition-all {moodFilter === mood
									? 'border-gray-900 bg-gray-50 dark:border-white dark:bg-gray-800'
									: 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}"
								title={mood}
							>
								<span class="text-xl">{getMoodEmoji(mood)}</span>
							</button>
						{/each}
					</div>

					<!-- Tag Filter (Newly Added) -->
					<div class="flex gap-2">
						{#if data.topTags.length > 0}
							<button
								onclick={() => {
									tagFilter = '';
									updateFilters();
								}}
								class="rounded-lg border px-4 py-2 transition-all {tagFilter === ''
									? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
									: 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600'}"
							>
								All Tags
							</button>
							{#each data.topTags as tag}
								<button
									onclick={() => {
										tagFilter = tag.name;
										updateFilters();
									}}
									class="rounded-lg border px-3 py-2 transition-all {tagFilter === tag.name
										? 'border-gray-900 bg-gray-50 dark:border-white dark:bg-gray-800'
										: 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}"
									title={tag.name}
								>
									<span class="text-gray-700 dark:text-gray-300">{tag.name}</span>
								</button>
							{/each}
						{/if}
					</div>

					<button
						onclick={updateFilters}
						class="rounded-lg bg-gray-900 px-6 py-2 font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
					>
						Apply
					</button>
				</div>
			</div>
		</div>

		<!-- Tag Cloud -->
		{#if data.topTags.length > 0}
			<div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
				<div class="mb-3 flex items-center justify-between">
					<h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">Popular Tags</h3>
					{#if data.filters.tag}
						<button
							onclick={() => {
								data.filters.tag = '';
								updateFilters();
							}}
							class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
						>
							Clear filter
						</button>
					{/if}
				</div>
				<div class="flex flex-wrap gap-2">
					{#each data.topTags as tag}
						<button
							onclick={() => {
								data.filters.tag = tag.name;
								updateFilters();
							}}
							class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors {data
								.filters.tag === tag.name
								? 'border border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
								: tag.type === 'keyword'
									? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
									: 'border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800'}"
							title="{tag.type === 'keyword' ? 'Keyword' : 'Entity'} • {tag.count} {tag.count === 1
								? 'entry'
								: 'entries'}"
						>
							{#if tag.type === 'entity'}
								<span>👤</span>
							{/if}
							<span>{tag.name}</span>
							<span class="text-gray-500 dark:text-gray-500">({tag.count})</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Entries List -->
		<PullToRefresh onRefresh={handleRefresh} class="min-h-screen">
			{#if data.entries.length === 0}
				<div class="rounded-lg bg-white p-12 text-center shadow dark:bg-gray-800">
					<div class="mb-4 text-6xl">📔</div>
					<h2 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">No entries yet</h2>
					<p class="mb-6 text-gray-600 dark:text-gray-400">
						{data.filters.mood !== 'all' || data.filters.search
							? 'No entries match your filters. Try adjusting your search.'
							: 'Start your journaling journey by creating your first entry.'}
					</p>
					<a
						href="/journal/new"
						class="inline-block rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
					>
						Create First Entry
					</a>
				</div>
			{:else}
				<div class="space-y-4">
					{#each data.entries as entry (entry.id)}
						<a
							href="/journal/{entry.id}"
							class="block rounded-lg border border-gray-200 bg-white p-6 shadow transition-all hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
						>
							<div class="flex gap-4">
								<!-- Mood Emoji -->
								<div class="flex-shrink-0">
									<span class="text-4xl">{getMoodEmoji(entry.mood)}</span>
								</div>

								<!-- Content -->
								<div class="min-w-0 flex-1">
									<div class="mb-2 flex items-start justify-between gap-4">
										<h2 class="text-lg font-semibold text-gray-900 capitalize dark:text-white">
											{entry.mood}
										</h2>
									<span
										class="flex items-center gap-1 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400"
									>
										<span>{formatRelativeTime(entry.createdAt)}</span>
										{#if entry.sentimentScore !== null && entry.sentimentScore !== undefined}
											<span
												title="Sentiment: {entry.sentimentLabel} ({entry.sentimentScore > 0
													? '+'
													: ''}{entry.sentimentScore})"
											>
												{getSentimentEmoji(entry.sentimentScore)}
											</span>
										{/if}
									</span>
								</div>
								<p class="line-clamp-3 text-gray-700 dark:text-gray-300">
									{entry.excerpt}
								</p>

								<!-- Tags -->
								{#if entry.tags && entry.tags.length > 0}
									<div class="mt-2 flex flex-wrap gap-1">
										{#each entry.tags.slice(0, 3) as tag}
											<span
												class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs {tag.type ===
												'keyword'
													? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
													: 'border border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400'}"
											>
												{#if tag.type === 'entity'}
													<span>👤</span>
												{/if}
												<span>{tag.name}</span>
											</span>
										{/each}
										{#if entry.tags.length > 3}
											<span class="text-xs text-gray-500 dark:text-gray-500">
												+{entry.tags.length - 3} more
											</span>
										{/if}
									</div>
								{/if}
							</div>

							<!-- Arrow -->
							<div class="flex-shrink-0 self-center">
								<svg
									class="h-6 w-6 text-gray-400 dark:text-gray-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</div>
						</div>
					</a>
				{/each}
			</div>

			<!-- Pagination -->
			{#if data.pagination.totalPages > 1}
				<div class="mt-8 flex items-center justify-center gap-2">
					<button
						onclick={() => goToPage(data.pagination.page - 1)}
						disabled={data.pagination.page === 1}
						class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
					>
						← Previous
					</button>

					<span class="px-4 py-2 text-gray-700 dark:text-gray-300">
						Page {data.pagination.page} of {data.pagination.totalPages}
					</span>

					<button
						onclick={() => goToPage(data.pagination.page + 1)}
						disabled={data.pagination.page >= data.pagination.totalPages}
						class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
					>
						Next →
					</button>
				</div>
			{/if}
		{/if}
	</PullToRefresh>
	</div>
</div>
