<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();

	function getPriorityColor(priority: string) {
		switch (priority) {
			case 'high':
				return 'border-red-500 bg-red-50 dark:bg-red-900/20';
			case 'medium':
				return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
			case 'low':
				return 'border-green-500 bg-green-50 dark:bg-green-900/20';
			default:
				return 'border-gray-500 bg-gray-50 dark:bg-gray-700/20';
		}
	}

	function getTypeIcon(type: string) {
		switch (type) {
			case 'breathing':
				return '🫁';
			case 'meditation':
				return '🧘';
			case 'activity':
				return '🏃';
			case 'prompt':
				return '✍️';
			case 'resource':
				return '📚';
			case 'insight':
				return '💡';
			default:
				return '🎯';
		}
	}
</script>

<svelte:head>
	<title>Wellness - Mood Journal</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<div class="mx-auto max-w-6xl px-4 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Wellness Center</h1>
			<p class="text-gray-600 dark:text-gray-400">
				Personalized recommendations to support your mental wellness journey
			</p>
		</div>

		<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
			<!-- Main Content -->
			<div class="space-y-8 lg:col-span-2">
				<!-- Personalized Recommendations -->
				{#if data.recommendations.length > 0}
					<div class="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
						<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
							Personalized for You
						</h2>
						<div class="space-y-4">
							{#each data.recommendations as recommendation}
								<div
									class="rounded-r-lg border-l-4 p-4 {getPriorityColor(recommendation.priority)}"
								>
									<div class="flex items-start gap-3">
										<span class="text-2xl">{recommendation.icon}</span>
										<div class="flex-1">
											<div class="mb-1 flex items-center gap-2">
												<h3 class="font-medium text-gray-900 dark:text-white">
													{recommendation.title}
												</h3>
												<span
													class="rounded-full bg-gray-200 px-2 py-1 text-xs text-gray-700 capitalize dark:bg-gray-700 dark:text-gray-300"
												>
													{recommendation.type}
												</span>
												{#if recommendation.duration}
													<span class="text-xs text-gray-500 dark:text-gray-400"
														>{recommendation.duration}</span
													>
												{/if}
											</div>
											<p class="mb-2 text-sm text-gray-600 dark:text-gray-400">
												{recommendation.description}
											</p>
											{#if recommendation.url}
												<a
													href={recommendation.url}
													target="_blank"
													rel="noopener noreferrer"
													class="text-sm text-blue-600 hover:underline dark:text-blue-400"
												>
													Learn more →
												</a>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Journaling Prompts -->
				<div class="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
					<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
						Journaling Prompts
					</h2>
					<div class="space-y-3">
						{#each data.prompts as prompt, i}
							<div class="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
								<span class="mt-0.5 text-lg">💭</span>
								<p class="flex-1 text-gray-700 dark:text-gray-300">{prompt}</p>
							</div>
						{/each}
					</div>
					<button
						onclick={() => goto('/journal/new')}
						class="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
					>
						Start Journaling
					</button>
				</div>
			</div>

			<!-- Sidebar -->
			<div class="space-y-6">
				<!-- Breathing Exercises -->
				<div class="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
					<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
						Breathing Exercises
					</h3>
					<div class="space-y-4">
						{#each data.breathingExercises as exercise}
							<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
								<h4 class="mb-2 font-medium text-gray-900 dark:text-white">{exercise.name}</h4>
								<p class="mb-3 text-sm text-gray-600 dark:text-gray-400">{exercise.description}</p>
								<div class="mb-2 text-xs text-gray-500 dark:text-gray-400">
									<strong>Duration:</strong>
									{exercise.duration}
								</div>
								<details class="text-sm">
									<summary class="cursor-pointer text-blue-600 hover:underline dark:text-blue-400">
										View Steps
									</summary>
									<ol class="mt-2 list-inside list-decimal space-y-1">
										{#each exercise.steps as step}
											<li class="text-gray-600 dark:text-gray-400">{step}</li>
										{/each}
									</ol>
								</details>
							</div>
						{/each}
					</div>
				</div>

				<!-- Mood Patterns -->
				{#if data.moodPatterns.length > 0}
					<div class="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
						<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
							Your Mood Patterns
						</h3>
						<div class="space-y-3">
							{#each data.moodPatterns.slice(0, 5) as pattern}
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<span class="text-lg">
											{pattern.mood === 'happy'
												? '😊'
												: pattern.mood === 'sad'
													? '😢'
													: pattern.mood === 'anxious'
														? '😰'
														: pattern.mood === 'excited'
															? '🤩'
															: pattern.mood === 'neutral'
																? '😐'
																: '😐'}
										</span>
										<span class="text-gray-700 capitalize dark:text-gray-300">{pattern.mood}</span>
									</div>
									<div class="text-right">
										<div class="text-sm font-medium text-gray-900 dark:text-white">
											{pattern.frequency}x
										</div>
										<div class="text-xs text-gray-500 dark:text-gray-400">
											Avg: {Math.round(pattern.averageSentiment)}%
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Quick Actions -->
				<div class="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
					<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
					<div class="space-y-2">
						<button
							onclick={() => goto('/journal/new')}
							class="w-full rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
						>
							<div class="flex items-center gap-3">
								<span class="text-lg">📝</span>
								<div>
									<div class="font-medium text-gray-900 dark:text-white">New Entry</div>
									<div class="text-sm text-gray-500 dark:text-gray-400">Start writing</div>
								</div>
							</div>
						</button>

						<button
							onclick={() => goto('/journal/analytics')}
							class="w-full rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
						>
							<div class="flex items-center gap-3">
								<span class="text-lg">📊</span>
								<div>
									<div class="font-medium text-gray-900 dark:text-white">View Analytics</div>
									<div class="text-sm text-gray-500 dark:text-gray-400">Track your progress</div>
								</div>
							</div>
						</button>

						<button
							onclick={() => goto('/achievements')}
							class="w-full rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
						>
							<div class="flex items-center gap-3">
								<span class="text-lg">🏆</span>
								<div>
									<div class="font-medium text-gray-900 dark:text-white">Achievements</div>
									<div class="text-sm text-gray-500 dark:text-gray-400">View your progress</div>
								</div>
							</div>
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
