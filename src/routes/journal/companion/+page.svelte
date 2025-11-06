<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Separator } from '$lib/components/ui/separator';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let message = $state('');
	let sending = $state(false);
	let messagesContainer: HTMLDivElement | undefined = $state();
	let clearingHistory = $state(false);

	// Scroll to bottom when messages update or when sending
	$effect(() => {
		if (messagesContainer) {
			setTimeout(() => {
				if (messagesContainer) {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}
			}, 100);
		}
	});

	// Check if AI is properly configured
	const isConfigured = $derived(
		data.settings?.ai_enabled && data.settings?.privacy_consent && data.settings?.has_api_key
	);

	// Format provider and model display
	function getProviderDisplay(provider?: string): string {
		switch (provider?.toLowerCase()) {
			case 'openai':
				return 'OpenAI';
			case 'groq':
				return 'Groq';
			case 'gemini':
				return 'Google Gemini';
			case 'local':
				return 'Local (Ollama)';
			default:
				return 'OpenAI';
		}
	}

	function getModelDisplay(model?: string, provider?: string): string {
		// If model is provided, use it
		if (model) {
			// Clean up model names for display
			return model.replace('gpt-', 'GPT-').replace('llama', 'Llama').replace('gemini-', 'Gemini ');
		}

		// Otherwise, show the default for this provider
		switch (provider?.toLowerCase()) {
			case 'openai':
				return 'GPT-4o mini (default)';
			case 'groq':
				return 'Llama 3 8B (default)';
			case 'gemini':
				return 'Gemini 1.5 Flash (default)';
			case 'local':
				return 'llama3.2:3b (default)';
			default:
				return 'GPT-4o mini (default)';
		}
	}

	function formatTime(timestamp: Date | number): string {
		const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
</script>

<div class="container mx-auto max-w-4xl py-8">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">AI Companion</h1>
			<p class="text-muted-foreground mt-2">
				{#if data.entryId}
					Discussing a specific journal entry
				{:else}
					Chat about your journal entries and mood patterns. The AI uses relevant past entries to
					provide personalized insights.
				{/if}
			</p>
			{#if isConfigured && data.settings}
				<p class="text-muted-foreground mt-1 text-xs">
					Using {getProviderDisplay(data.settings.provider)} • {getModelDisplay(
						data.settings.model,
						data.settings.provider
					)}
				</p>
			{/if}
		</div>
		<div class="flex gap-2">
			<Button variant="outline" href="/journal">← Back to Journal</Button>
			{#if data.messages.length > 0}
				<form
					method="POST"
					action="?/clearHistory"
					use:enhance={() => {
						clearingHistory = true;
						return async ({ update }) => {
							await update();
							clearingHistory = false;
						};
					}}
				>
					<Button variant="destructive" type="submit" disabled={clearingHistory}>
						{clearingHistory ? 'Clearing...' : 'Clear History'}
					</Button>
				</form>
			{/if}
		</div>
	</div>

	<Separator class="mb-6" />

	{#if !isConfigured}
		<Card class="mb-6 border-amber-500">
			<CardHeader>
				<CardTitle>⚙️ Setup Required</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<p class="text-muted-foreground">
					The AI companion needs to be configured before you can start chatting.
				</p>
				<div class="space-y-2 text-sm">
					<div class="flex items-center gap-2">
						{#if data.settings?.ai_enabled}
							<span class="text-green-600">✓</span>
						{:else}
							<span class="text-red-600">✗</span>
						{/if}
						<span>AI companion enabled</span>
					</div>
					<div class="flex items-center gap-2">
						{#if data.settings?.privacy_consent}
							<span class="text-green-600">✓</span>
						{:else}
							<span class="text-red-600">✗</span>
						{/if}
						<span>Privacy consent accepted</span>
					</div>
					<div class="flex items-center gap-2">
						{#if data.settings?.has_api_key}
							<span class="text-green-600">✓</span>
						{:else}
							<span class="text-red-600">✗</span>
						{/if}
						<span>
							{#if data.settings?.provider === 'local'}
								Model configured (local)
							{:else if data.settings?.provider === 'groq'}
								Groq API key configured
							{:else if data.settings?.provider === 'gemini'}
								Gemini API key configured
							{:else}
								OpenAI API key configured
							{/if}
						</span>
					</div>
				</div>
				<Button href="/account/ai">Configure AI Settings</Button>
			</CardContent>
		</Card>
	{:else}
		<!-- Chat Interface -->
		<Card class="flex h-[600px] flex-col">
			<!-- Messages -->
			<div bind:this={messagesContainer} class="flex-1 space-y-4 overflow-y-auto p-4">
				{#if data.messages.length === 0}
					<div class="flex h-full items-center justify-center">
						<div class="max-w-md space-y-4 text-center">
							<div class="text-6xl">🤖</div>
							<div class="space-y-2">
								<p class="text-lg font-medium">Welcome to your AI Companion!</p>
								<p class="text-muted-foreground text-sm">
									I'm here to help you reflect on your journal entries and mood patterns.
								</p>
							</div>
							<div class="space-y-2 rounded-lg bg-blue-50 p-4 text-left text-sm dark:bg-blue-950">
								<p class="font-medium">💡 You can ask me about:</p>
								<ul class="text-muted-foreground space-y-1">
									<li>• Patterns you've noticed in your mood</li>
									<li>• Insights from your recent entries</li>
									<li>• Help processing difficult emotions</li>
									<li>• Identifying triggers or positive moments</li>
									<li>• Anything else on your mind!</li>
								</ul>
							</div>
							<p class="text-muted-foreground text-xs">Type a message below to get started</p>
						</div>
					</div>
				{:else}
					{#each data.messages as msg (msg.created_at)}
						<div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
							<div
								class="max-w-[80%] rounded-lg px-4 py-2 {msg.role === 'user'
									? 'bg-blue-600 text-white'
									: 'bg-gray-100 dark:bg-gray-800'}"
							>
								<div class="flex items-start gap-2">
									<span class="text-lg">{msg.role === 'user' ? '🧑' : '🤖'}</span>
									<div class="flex-1">
										<p class="text-sm whitespace-pre-wrap">{msg.content}</p>
										<p
											class="mt-1 text-xs {msg.role === 'user'
												? 'text-blue-100'
												: 'text-muted-foreground'}"
										>
											{formatTime(msg.created_at)}
										</p>
									</div>
								</div>
							</div>
						</div>
					{/each}

					<!-- Show loading indicator when sending -->
					{#if sending}
						<div class="flex justify-start">
							<div class="max-w-[80%] rounded-lg bg-gray-100 px-4 py-2 dark:bg-gray-800">
								<div class="flex items-start gap-2">
									<span class="text-lg">🤖</span>
									<div class="flex-1">
										<p class="text-sm">
											<span class="inline-flex gap-1">
												<span class="animate-bounce" style="animation-delay: 0ms">.</span>
												<span class="animate-bounce" style="animation-delay: 150ms">.</span>
												<span class="animate-bounce" style="animation-delay: 300ms">.</span>
											</span>
											Thinking...
										</p>
									</div>
								</div>
							</div>
						</div>
					{/if}
				{/if}

				<!-- Show form errors/success -->
				{#if form?.message && !sending}
					<div class="flex justify-center">
						<div
							class="rounded-lg px-4 py-2 {form.success
								? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
								: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}"
						>
							<p class="text-sm">{form.message}</p>
						</div>
					</div>
				{/if}
			</div>

			<Separator />

			<!-- Input Form -->
			<form
				method="POST"
				action="?/sendMessage"
				class="p-4"
				use:enhance={() => {
					sending = true;
					const currentMessage = message;
					message = ''; // Clear input immediately
					return async ({ update }) => {
						await update();
						sending = false;
						// Restore message if there was an error
						if (form && !form.success) {
							message = currentMessage;
						}
					};
				}}
			>
				<div class="flex gap-2">
					<Textarea
						name="message"
						bind:value={message}
						placeholder="Type your message..."
						rows={3}
						disabled={sending}
						class="flex-1 resize-none"
						onkeydown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								if (message.trim()) {
									e.currentTarget.form?.requestSubmit();
								}
							}
						}}
					/>
					<Button type="submit" disabled={sending || !message.trim()} class="self-end">
						{#if sending}
							<span class="inline-flex gap-1">
								<span class="animate-pulse">Sending</span>
								<span class="animate-bounce" style="animation-delay: 0ms">.</span>
								<span class="animate-bounce" style="animation-delay: 150ms">.</span>
								<span class="animate-bounce" style="animation-delay: 300ms">.</span>
							</span>
						{:else}
							Send
						{/if}
					</Button>
				</div>
				<p class="text-muted-foreground mt-2 text-xs">
					💡 Press <kbd
						class="rounded border bg-gray-100 px-1.5 py-0.5 text-xs font-semibold dark:bg-gray-800"
						>Enter</kbd
					>
					to send,
					<kbd
						class="rounded border bg-gray-100 px-1.5 py-0.5 text-xs font-semibold dark:bg-gray-800"
						>Shift+Enter</kbd
					> for new line
				</p>
			</form>
		</Card>
	{/if}
</div>
