<!-- eslint-disable svelte/no-navigation-without-resolve -->
<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Button } from '$lib/components/ui/button';
	import { resolve } from '$app/paths';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';

	let { children, data } = $props();

	function initials(name: string) {
		if (!name) return '?';
		const parts = name.trim().split(/\s+/);
		const [a, b] = [parts[0]?.[0] ?? '', parts[1]?.[0] ?? ''];
		return (a + b).toUpperCase() || name[0]?.toUpperCase() || '?';
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="bg-background text-foreground min-h-screen">
	<header
		class="supports-[backdrop-filter]:bg-background/80 sticky top-0 z-10 border-b backdrop-blur"
	>
		<div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
			<a href={resolve('/')} class="text-xl font-semibold tracking-tight md:text-2xl"
				>Mood Journal</a
			>
			<nav class="flex items-center gap-3">
				{#if data?.user}
					<a
						href={resolve('/account/profile')}
						class="flex items-center gap-2 rounded-full transition-opacity hover:opacity-80"
					>
						{#if data.user.avatarUrl}
							<img
								src={data.user.avatarUrl}
								alt="avatar"
								class="h-8 w-8 rounded-full object-cover"
							/>
						{:else}
							<div
								class="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
							>
								{initials(data.user.username)}
							</div>
						{/if}
						<span class="hidden text-sm sm:inline">{data.user.username}</span>
					</a>
					<form method="post" action="/auth/logout">
						<Button type="submit" variant="ghost" size="sm" class="text-destructive">Logout</Button>
					</form>
				{:else}
					<Button href="/auth/login" size="sm">Sign in</Button>
				{/if}
			</nav>
		</div>
	</header>
	{@render children?.()}
	<BottomNav />
	<InstallPrompt />
</div>
