<script lang="ts">
	import { journalTemplates, formatTemplate, type JournalTemplate } from '$lib/templates';

	interface Props {
		onSelectTemplate: (content: string) => void;
	}

	let { onSelectTemplate }: Props = $props();

	let showTemplates = $state(false);
	let selectedCategory = $state<string | null>(null);

	function handleSelectTemplate(template: JournalTemplate) {
		const formattedContent = formatTemplate(template.template);
		onSelectTemplate(formattedContent);
		showTemplates = false;
	}
</script>

<div class="template-selector">
	<button
		onclick={() => (showTemplates = !showTemplates)}
		class="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-purple-700"
		type="button"
	>
		<span class="text-lg">📝</span>
		<span>Use Template</span>
		<span class="text-xs opacity-75">({journalTemplates.length})</span>
	</button>

	{#if showTemplates}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			onclick={(e) => {
				if (e.target === e.currentTarget) showTemplates = false;
			}}
			onkeydown={(e) => {
				if (e.key === 'Escape') showTemplates = false;
			}}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<div
				class="max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800"
			>
				<!-- Header -->
				<div
					class="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700"
				>
					<div>
						<h2 class="text-2xl font-bold text-gray-900 dark:text-white">Journal Templates</h2>
						<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
							Choose a template to guide your journaling
						</p>
					</div>
					<button
						onclick={() => (showTemplates = false)}
						class="text-2xl leading-none text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
						type="button"
						aria-label="Close"
					>
						×
					</button>
				</div>

				<!-- Templates Grid -->
				<div class="max-h-[calc(80vh-120px)] overflow-y-auto p-6">
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{#each journalTemplates as template}
							<button
								onclick={() => handleSelectTemplate(template)}
								class="group rounded-lg border-2 border-transparent bg-gradient-to-br from-gray-50 to-gray-100 p-5 text-left transition-all hover:border-purple-500 hover:shadow-lg dark:from-gray-700 dark:to-gray-800 dark:hover:border-purple-400"
								type="button"
							>
								<div class="mb-3 flex items-start gap-3">
									<span class="text-3xl transition-transform group-hover:scale-110">
										{template.icon}
									</span>
									<div class="flex-1">
										<h3
											class="font-bold text-gray-900 transition-colors group-hover:text-purple-600 dark:text-white dark:group-hover:text-purple-400"
										>
											{template.name}
										</h3>
									</div>
								</div>
								<p class="mb-3 text-sm text-gray-600 dark:text-gray-400">
									{template.description}
								</p>
								<div class="space-y-1 text-xs text-gray-500 dark:text-gray-500">
									{#each template.prompts.slice(0, 2) as prompt}
										<div class="flex items-start gap-1">
											<span class="opacity-50">•</span>
											<span class="line-clamp-1">{prompt}</span>
										</div>
									{/each}
									{#if template.prompts.length > 2}
										<div class="opacity-50">+{template.prompts.length - 2} more prompts</div>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.line-clamp-1 {
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		line-clamp: 1;
		overflow: hidden;
	}
</style>
