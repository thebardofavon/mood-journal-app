<script lang="ts">
	import { onMount } from 'svelte';

	let { children, onRefresh, class: className = '' } = $props();

	let container: HTMLElement;
	let isRefreshing = $state(false);
	let startY = $state(0);
	let currentY = $state(0);
	let isDragging = $state(false);
	let canRefresh = $state(false);

	function handleTouchStart(event: TouchEvent) {
		if (isRefreshing) return;

		const touch = event.touches[0];
		startY = touch.clientY;
		isDragging = true;
	}

	function handleTouchMove(event: TouchEvent) {
		if (!isDragging || isRefreshing) return;

		const touch = event.touches[0];
		currentY = touch.clientY;
		const deltaY = currentY - startY;

		// Only allow pull-to-refresh when at the top of the scrollable area
		if (container.scrollTop === 0 && deltaY > 0) {
			event.preventDefault();
			const pullDistance = Math.min(deltaY * 0.5, 80); // Dampen the pull and limit max distance
			container.style.transform = `translateY(${pullDistance}px)`;

			canRefresh = pullDistance > 40; // Threshold for refresh trigger
		}
	}

	async function handleTouchEnd() {
		if (!isDragging || isRefreshing) return;

		isDragging = false;

		if (canRefresh) {
			isRefreshing = true;
			canRefresh = false;

			try {
				await onRefresh();
			} finally {
				isRefreshing = false;
			}
		}

		// Reset transform
		container.style.transform = '';
		currentY = 0;
		startY = 0;
	}

	onMount(() => {
		container.addEventListener('touchstart', handleTouchStart, { passive: false });
		container.addEventListener('touchmove', handleTouchMove, { passive: false });
		container.addEventListener('touchend', handleTouchEnd, { passive: false });

		return () => {
			container.removeEventListener('touchstart', handleTouchStart);
			container.removeEventListener('touchmove', handleTouchMove);
			container.removeEventListener('touchend', handleTouchEnd);
		};
	});
</script>

<div
	bind:this={container}
	class="relative {className}"
>
	{#if isRefreshing}
		<div class="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-2 shadow-lg dark:bg-gray-800">
			<div class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-300"></div>
			<span class="text-sm text-gray-600 dark:text-gray-300">Refreshing...</span>
		</div>
	{/if}

	{#if canRefresh && !isRefreshing}
		<div class="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-2 shadow-lg dark:bg-gray-800">
			<span class="text-xl">⬇️</span>
			<span class="text-sm text-gray-600 dark:text-gray-300">Release to refresh</span>
		</div>
	{/if}

	{@render children?.()}
</div>