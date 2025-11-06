<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let { class: className = '' } = $props();

	const isJournalActive = $derived($page.url.pathname.startsWith('/journal') && !$page.url.pathname.includes('/analytics') && !$page.url.pathname.includes('/companion') && !$page.url.pathname.includes('/wellness'));
	const isAnalyticsActive = $derived($page.url.pathname.includes('/analytics'));
	const isWellnessActive = $derived($page.url.pathname.includes('/wellness'));
	const isAIActive = $derived($page.url.pathname.includes('/companion'));
	const isAccountActive = $derived($page.url.pathname.startsWith('/account'));

	const navItems = [
		{
			label: 'Journal',
			icon: '📝',
			href: '/journal',
			get active() { return isJournalActive; }
		},
		{
			label: 'Analytics',
			icon: '📊',
			href: '/journal/analytics',
			get active() { return isAnalyticsActive; }
		},
		{
			label: 'Wellness',
			icon: '🧘',
			href: '/wellness',
			get active() { return isWellnessActive; }
		},
		{
			label: 'AI',
			icon: '🤖',
			href: '/journal/companion',
			get active() { return isAIActive; }
		},
		{
			label: 'Account',
			icon: '👤',
			href: '/account',
			get active() { return isAccountActive; }
		}
	];

	function handleNavClick(href: string) {
		goto(href);
	}
</script>

<!-- Mobile Bottom Navigation -->
<div class="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 {className}">
	<div class="mx-auto flex max-w-md">
		{#each navItems as item}
			<button
				onclick={() => handleNavClick(item.href)}
				class="flex flex-1 flex-col items-center justify-center py-2 px-1 text-center transition-colors {item.active
					? 'text-blue-600 dark:text-blue-400'
					: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}"
			>
				<span class="text-lg">{item.icon}</span>
				<span class="mt-1 text-xs font-medium">{item.label}</span>
			</button>
		{/each}
	</div>
</div>

<!-- Add padding to body to account for fixed nav -->
<style>
	:global(body) {
		padding-bottom: 5rem;
	}
</style>