<script lang="ts">
	let { children } = $props();
	// Simple, centered auth layout
	const year = new Date().getFullYear();
	const appName = 'Mood Journal';
	const description = 'A privacy-first journaling app';
	const footer = `${appName} \u00B7 ${year}`;
</script>

<div class="bg-background flex min-h-screen items-center justify-center px-4">
	<div class="w-full max-w-md">
		<div class="mb-6 text-center">
			<h1 class="text-3xl font-semibold tracking-tight">{appName}</h1>
			<p class="text-muted-foreground mt-1 text-sm">{description}</p>
		</div>

		<main class="border-border bg-card rounded-xl border p-6 shadow-sm">
			{@render children?.()}
		</main>

		<p class="text-muted-foreground mt-6 text-center text-xs">{footer}</p>
	</div>
</div>
