<script lang="ts">
	import { page } from '$app/stores';

	// Error page for unhandled errors
	let status = $derived($page.status);
	let message = $derived($page.error?.message || 'An unexpected error occurred');

	const errorDetails: Record<number, { title: string; description: string }> = {
		404: {
			title: 'Page Not Found',
			description: 'The page you are looking for does not exist or has been moved.'
		},
		403: {
			title: 'Access Forbidden',
			description: 'You do not have permission to access this resource.'
		},
		500: {
			title: 'Internal Server Error',
			description: 'Something went wrong on our end. Please try again later.'
		},
		503: {
			title: 'Service Unavailable',
			description: 'The service is temporarily unavailable. Please try again in a moment.'
		}
	};

	let detail = $derived(
		errorDetails[status] || {
			title: `Error ${status}`,
			description: 'An error occurred while processing your request.'
		}
	);
</script>

<svelte:head>
	<title>{detail.title} · Mood Journal</title>
</svelte:head>

<div
	class="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4 dark:from-slate-950 dark:to-slate-900"
>
	<div class="text-center">
		<!-- Error Icon -->
		<div class="mb-6 flex justify-center">
			<div
				class="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30"
			>
				<svg
					class="h-10 w-10 text-red-600 dark:text-red-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
			</div>
		</div>

		<!-- Error Status -->
		<h1 class="mb-2 text-6xl font-bold text-slate-900 dark:text-slate-100">{status}</h1>

		<!-- Error Title -->
		<h2 class="mb-4 text-2xl font-semibold text-slate-800 dark:text-slate-200">
			{detail.title}
		</h2>

		<!-- Error Description -->
		<p class="mb-8 max-w-md text-slate-600 dark:text-slate-400">
			{detail.description}
		</p>

		{#if message && message !== detail.description}
			<div
				class="mx-auto mb-8 max-w-md rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
			>
				{message}
			</div>
		{/if}

		<!-- Action Buttons -->
		<div class="flex flex-col gap-3 sm:flex-row sm:justify-center">
			<a
				href="/journal"
				class="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-6 py-3 font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
					/>
				</svg>
				Go to Journal
			</a>

			<button
				onclick={() => window.history.back()}
				class="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:ring-2 focus:ring-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 19l-7-7m0 0l7-7m-7 7h18"
					/>
				</svg>
				Go Back
			</button>
		</div>
	</div>
</div>
