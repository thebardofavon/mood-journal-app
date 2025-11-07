<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let {
		achievement,
		onClose = () => {}
	}: {
		achievement: {
			id: string;
			title: string;
			description: string;
			icon: string;
			xp: number;
		};
		onClose?: () => void;
	} = $props();

	// Auto-close after 5 seconds
	let timeout = setTimeout(() => {
		onClose();
	}, 5000);

	function handleClose() {
		clearTimeout(timeout);
		onClose();
	}
</script>

<div
	role="alert"
	class="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]"
	transition:fly={{ y: 50, duration: 400, easing: cubicOut }}
>
	<div
		class="relative overflow-hidden rounded-lg border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50 p-4 shadow-2xl dark:border-yellow-600 dark:from-yellow-900/30 dark:to-amber-900/30"
	>
		<!-- Sparkle effect -->
		<div class="absolute inset-0 animate-pulse bg-yellow-200/20 dark:bg-yellow-400/10"></div>

		<div class="relative flex items-start gap-4">
			<!-- Icon with animation -->
			<div class="flex-shrink-0">
				<div
					class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-3xl shadow-lg"
					style="animation: bounce 0.5s ease-in-out;"
				>
					{achievement.icon}
				</div>
			</div>

			<!-- Content -->
			<div class="flex-1 min-w-0">
				<div class="mb-1 flex items-center gap-2">
					<h3 class="text-lg font-bold text-gray-900 dark:text-white">
						🎉 Achievement Unlocked!
					</h3>
				</div>
				<p class="mb-1 text-base font-semibold text-gray-800 dark:text-gray-200">
					{achievement.title}
				</p>
				<p class="mb-2 text-sm text-gray-600 dark:text-gray-400">
					{achievement.description}
				</p>
				<div class="flex items-center gap-2">
					<span
						class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
					>
						<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
							<path
								d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
							/>
						</svg>
						+{achievement.xp} XP
					</span>
				</div>
			</div>

			<!-- Close button -->
			<button
				onclick={handleClose}
				class="flex-shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
				aria-label="Close"
			>
				<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		</div>
	</div>
</div>

<style>
	@keyframes bounce {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.2);
		}
	}
</style>
