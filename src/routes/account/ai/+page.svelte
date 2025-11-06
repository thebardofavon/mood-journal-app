<script lang="ts">
	import { enhance } from '$app/forms';
	import { onDestroy, onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import type { ActionData, PageData } from './$types';

	type ProviderOption = 'openai' | 'groq' | 'gemini' | 'local';

	const providerOptions: Array<{ value: ProviderOption; label: string; description: string }> = [
		{
			value: 'openai',
			label: 'OpenAI',
			description: 'GPT-4o models with high availability and quality.'
		},
		{
			value: 'groq',
			label: 'Groq',
			description: 'Low-latency Llama 3 in the Groq Cloud.'
		},
		{
			value: 'gemini',
			label: 'Google Gemini',
			description: 'Gemini 1.5 models with strong multimodal support.'
		},
		{
			value: 'local',
			label: 'Local (Ollama)',
			description: 'Runs on this server—no external API calls.'
		}
	];

	const modelOptions: Record<
		Exclude<ProviderOption, 'local'>,
		Array<{ value: string; label: string }>
	> = {
		openai: [
			{ value: 'gpt-4o-mini', label: 'GPT-4o mini (recommended)' },
			{ value: 'gpt-4o', label: 'GPT-4o' },
			{ value: 'gpt-4.1-mini', label: 'GPT-4.1 mini' }
		],
		groq: [
			{ value: 'llama3-8b-8192', label: 'Llama 3 8B (fast)' },
			{ value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B (high quality)' }
		],
		gemini: [
			{ value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
			{ value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
		]
	};

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Ollama models state
	let ollamaModels: Array<{ name: string; displayName: string; size: number }> = $state([]);
	let ollamaAvailable = $state(false);
	let loadingOllamaModels = $state(false);
	let ollamaError = $state<string | null>(null);

	const initialProvider = (data.settings?.provider as ProviderOption | undefined) ?? 'openai';
	const initialModel =
		data.settings?.model ??
		(initialProvider === 'local'
			? 'llama3.2:3b'
			: modelOptions[initialProvider as Exclude<ProviderOption, 'local'>][0].value);

	let ai_enabled = $state(data.settings?.ai_enabled ?? false);
	let privacy_consent = $state(data.settings?.privacy_consent ?? false);
	let provider = $state<ProviderOption>(initialProvider);
	let model = $state(initialModel);
	let openai_api_key = $state('');
	let groq_api_key = $state('');
	let gemini_api_key = $state('');
	let show_openai_key = $state(false);
	let show_groq_key = $state(false);
	let show_gemini_key = $state(false);
	let saving = $state(false);
	let resetTimer: ReturnType<typeof setTimeout> | null = null;

	// Reactive local models based on Ollama availability
	let localModelOptions = $derived(
		ollamaAvailable && ollamaModels.length > 0
			? ollamaModels.map((m) => ({
					value: m.name,
					label: `${m.displayName} (${formatBytes(m.size)})`
				}))
			: [{ value: 'llama3.2:3b', label: 'Install Ollama and run: ollama pull llama3.2:3b' }]
	);

	// Get model options for current provider
	let currentModelOptions = $derived(
		provider === 'local'
			? localModelOptions
			: modelOptions[provider as Exclude<ProviderOption, 'local'>]
	);

	function isLikelyOpenAIKey(key: string): boolean {
		return key.startsWith('sk-') && key.length > 20;
	}

	function isLikelyGroqKey(key: string): boolean {
		return key.startsWith('gsk_') && key.length > 20;
	}

	function isLikelyGeminiKey(key: string): boolean {
		return (key.startsWith('AI') || key.startsWith('AIza')) && key.length > 20;
	}

	function getDefaultModel(provider?: string): string {
		switch (provider?.toLowerCase()) {
			case 'openai':
				return 'gpt-4o-mini';
			case 'groq':
				return 'llama3-8b-8192';
			case 'gemini':
				return 'gemini-1.5-flash';
			case 'local':
				return 'llama3.2:3b';
			default:
				return 'gpt-4o-mini';
		}
	}

	function handleProviderChange(event: Event) {
		const select = event.currentTarget as HTMLSelectElement;
		const nextProvider = select.value as ProviderOption;
		const options =
			nextProvider === 'local'
				? localModelOptions
				: (modelOptions[nextProvider as Exclude<ProviderOption, 'local'>] ?? modelOptions.openai);
		if (!options.some((option) => option.value === model)) {
			model = options[0].value;
		}
	}

	function scheduleFormReset() {
		if (resetTimer) clearTimeout(resetTimer);
		resetTimer = setTimeout(() => {
			form = null;
			resetTimer = null;
		}, 3000);
	}

	onDestroy(() => {
		if (resetTimer) clearTimeout(resetTimer);
	});

	onMount(() => {
		// Load Ollama models on mount
		fetchOllamaModels();
	});

	async function fetchOllamaModels() {
		loadingOllamaModels = true;
		ollamaError = null;

		try {
			const response = await fetch('/api/ollama/models');
			const data = await response.json();

			if (data.available && data.models.length > 0) {
				ollamaAvailable = true;
				ollamaModels = data.models;
				// The localModelOptions $derived will automatically update
			} else {
				ollamaAvailable = false;
				ollamaError = data.error || 'No models installed';
			}
		} catch {
			ollamaAvailable = false;
			ollamaError = 'Failed to connect to Ollama';
		} finally {
			loadingOllamaModels = false;
		}
	}

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}
</script>

<div class="container mx-auto max-w-2xl py-8">
	<div class="mb-6">
		<h1 class="text-3xl font-bold">AI Companion Settings</h1>
		<p class="text-muted-foreground mt-2">
			Configure your personal AI companion for deeper journal insights
		</p>
	</div>

	<Separator class="mb-6" />

	{#if form?.success}
		<Card class="mb-6 border-green-500">
			<CardContent class="pt-6">
				<p class="font-medium text-green-600">✓ Settings saved successfully!</p>
			</CardContent>
		</Card>
	{/if}

	{#if form?.message}
		<Card class="mb-6 border-red-500">
			<CardContent class="pt-6">
				<p class="font-medium text-red-600">✗ {form.message}</p>
			</CardContent>
		</Card>
	{/if}

	<form
		method="POST"
		action="?/saveSettings"
		use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				await update();
				saving = false;
				if (form?.success) {
					scheduleFormReset();
				} else if (resetTimer) {
					clearTimeout(resetTimer);
					resetTimer = null;
				}
			};
		}}
	>
		<div class="space-y-6">
			<!-- Current Configuration Display -->
			{#if data.settings}
				<Card class="border-border bg-muted/50">
					<CardHeader>
						<CardTitle class="text-base">Current Configuration</CardTitle>
					</CardHeader>
					<CardContent class="space-y-2 text-sm">
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Provider:</span>
							<span class="font-medium">
								{providerOptions.find((p) => p.value === (data.settings?.provider || 'openai'))
									?.label || 'OpenAI'}
							</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Model:</span>
							<span class="font-mono text-xs font-medium">
								{data.settings.model || getDefaultModel(data.settings.provider)}
							</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Status:</span>
							<span class="font-medium">
								{#if data.settings.ai_enabled}
									<span>✓ Active</span>
								{:else}
									<span class="text-muted-foreground">○ Disabled</span>
								{/if}
							</span>
						</div>
					</CardContent>
				</Card>
			{/if}
			<!-- Enable AI Companion -->
			<Card>
				<CardHeader>
					<CardTitle>AI Companion</CardTitle>
					<CardDescription>
						Choose whether the reflective companion is active for your account.
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="flex items-center justify-between">
						<div class="space-y-1">
							<Label for="ai_enabled" class="text-base">Enable AI Companion</Label>
							<p class="text-muted-foreground text-sm">
								Turn this on to unlock reflective conversations.
							</p>
						</div>
						<label class="relative inline-flex cursor-pointer items-center">
							<input
								type="checkbox"
								id="ai_enabled"
								name="ai_enabled"
								bind:checked={ai_enabled}
								value="true"
								class="peer sr-only"
							/>
							<div
								class="peer bg-input peer-checked:bg-primary peer-focus:ring-ring after:border-border after:bg-background peer-checked:after:border-primary-foreground h-6 w-11 rounded-full peer-focus:ring-2 peer-focus:outline-none after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:transition-all after:content-[''] peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full"
							></div>
						</label>
					</div>
				</CardContent>
			</Card>

			<!-- Privacy Consent -->
			<Card>
				<CardHeader>
					<CardTitle>Privacy & Data Usage</CardTitle>
					<CardDescription>Review how journal data is handled for each provider</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="bg-muted space-y-2 rounded-lg p-4">
						<p class="text-sm font-medium">🔒 Your privacy matters</p>
						<ul class="text-muted-foreground space-y-1 text-sm">
							<li>• Entries only leave this server when you pick OpenAI, Groq, or Gemini</li>
							<li>• Local Gemma/Llama runs entirely on this server hardware</li>
							<li>• Conversation history stays in your encrypted database and can be cleared</li>
							<li>• Review the chosen provider's privacy policy before enabling cloud models</li>
						</ul>
					</div>

					<div class="flex items-start gap-2">
						<input
							type="checkbox"
							id="privacy_consent"
							name="privacy_consent"
							bind:checked={privacy_consent}
							value="true"
							class="mt-1"
						/>
						<Label for="privacy_consent" class="text-sm">
							I understand how my data is processed and consent to using the selected provider when
							cloud models are chosen.
						</Label>
					</div>
				</CardContent>
			</Card>

			<!-- Provider & Model Selection -->
			<Card>
				<CardHeader>
					<CardTitle>Model Provider</CardTitle>
					<CardDescription>
						Pick the service and model used for conversations. Local models keep everything on this
						server.
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="space-y-2">
						<Label for="provider">Preferred Provider</Label>
						<select
							id="provider"
							name="provider"
							bind:value={provider}
							onchange={handleProviderChange}
							class="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
						>
							{#each providerOptions as option (option.value)}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
						<p class="text-muted-foreground text-xs">
							{providerOptions.find((option) => option.value === provider)?.description}
						</p>
					</div>

					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<Label for="model">Model</Label>
							<div class="flex items-center gap-2">
								{#if data.settings?.model && model !== data.settings.model}
									<span class="text-xs text-amber-600 dark:text-amber-400"> (Modified) </span>
								{/if}
								{#if provider === 'local'}
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onclick={fetchOllamaModels}
										disabled={loadingOllamaModels}
										class="h-7 text-xs"
									>
										{#if loadingOllamaModels}
											<span class="mr-1 animate-spin">⟳</span>
											Checking...
										{:else}
											<span class="mr-1">🔄</span>
											Refresh Models
										{/if}
									</Button>
								{/if}
							</div>
						</div>
						<select
							id="model"
							name="model"
							bind:value={model}
							class="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
						>
							{#each currentModelOptions as option (option.value)}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>

						{#if provider === 'local'}
							{#if loadingOllamaModels}
								<p class="text-muted-foreground animate-pulse text-xs">
									Checking Ollama for installed models...
								</p>
							{:else if ollamaAvailable}
								<p class="text-xs text-green-600 dark:text-green-400">
									✓ Ollama is running with {ollamaModels.length} model{ollamaModels.length !== 1
										? 's'
										: ''} available
								</p>
							{:else}
								<div class="space-y-1 text-xs">
									<p class="text-amber-600 dark:text-amber-400">
										⚠️ {ollamaError || 'Ollama not available'}
									</p>
									<p class="text-muted-foreground">
										Install Ollama from <a
											href="https://ollama.com"
											target="_blank"
											class="underline">ollama.com</a
										>, then run:
										<code class="bg-muted rounded px-1 py-0.5">ollama pull llama3.2:3b</code>
									</p>
								</div>
							{/if}
						{/if}
					</div>
				</CardContent>
			</Card>

			<!-- API Key -->
			<Card>
				<CardHeader>
					<CardTitle>API Credentials</CardTitle>
					<CardDescription>Store API keys for any cloud providers you want to use.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-6">
					<div class="space-y-2 rounded-lg bg-amber-50 p-4 dark:bg-amber-950">
						<p class="text-sm font-medium">💡 Tips</p>
						<ul class="text-muted-foreground space-y-1 text-sm">
							<li>• Leave a field blank to keep the currently saved key</li>
							<li>• Rotate keys periodically for better security</li>
							<li>• Local models ignore API keys entirely</li>
						</ul>
					</div>

					<div class="space-y-2">
						<Label for="openai_api_key">
							OpenAI API Key {data.settings?.has_openai_key ? '(saved ✓)' : ''}
						</Label>
						<div class="flex gap-2">
							<Input
								type={show_openai_key ? 'text' : 'password'}
								id="openai_api_key"
								name="openai_api_key"
								bind:value={openai_api_key}
								placeholder={data.settings?.has_openai_key
									? '••••••••••••••••••••••••'
									: 'sk-proj-...'}
								class="flex-1"
							/>
							<Button
								type="button"
								variant="outline"
								onclick={() => (show_openai_key = !show_openai_key)}
							>
								{show_openai_key ? '👁️' : '🙈'}
							</Button>
						</div>
						<p class="text-muted-foreground text-xs">
							Used for GPT-4o models via the OpenAI platform.
						</p>
						{#if openai_api_key && !isLikelyOpenAIKey(openai_api_key)}
							<p class="text-xs text-red-600">⚠️ OpenAI keys normally start with "sk-".</p>
						{/if}
					</div>

					<Separator />

					<div class="space-y-2">
						<Label for="groq_api_key">
							Groq API Key {data.settings?.has_groq_key ? '(saved ✓)' : ''}
						</Label>
						<div class="flex gap-2">
							<Input
								type={show_groq_key ? 'text' : 'password'}
								id="groq_api_key"
								name="groq_api_key"
								bind:value={groq_api_key}
								placeholder={data.settings?.has_groq_key ? '••••••••••••••••••••••••' : 'gsk_...'}
								class="flex-1"
							/>
							<Button
								type="button"
								variant="outline"
								onclick={() => (show_groq_key = !show_groq_key)}
							>
								{show_groq_key ? '👁️' : '🙈'}
							</Button>
						</div>
						<p class="text-muted-foreground text-xs">
							Needed for Llama 3 models running through Groq.
						</p>
						{#if groq_api_key && !isLikelyGroqKey(groq_api_key)}
							<p class="text-xs text-red-600">⚠️ Groq keys usually start with "gsk_".</p>
						{/if}
					</div>

					<Separator />

					<div class="space-y-2">
						<Label for="gemini_api_key">
							Gemini API Key {data.settings?.has_gemini_key ? '(saved ✓)' : ''}
						</Label>
						<div class="flex gap-2">
							<Input
								type={show_gemini_key ? 'text' : 'password'}
								id="gemini_api_key"
								name="gemini_api_key"
								bind:value={gemini_api_key}
								placeholder={data.settings?.has_gemini_key
									? '••••••••••••••••••••••••'
									: 'AI... or AIza...'}
								class="flex-1"
							/>
							<Button
								type="button"
								variant="outline"
								onclick={() => (show_gemini_key = !show_gemini_key)}
							>
								{show_gemini_key ? '👁️' : '🙈'}
							</Button>
						</div>
						<p class="text-muted-foreground text-xs">Used for Gemini 1.5 models.</p>
						{#if gemini_api_key && !isLikelyGeminiKey(gemini_api_key)}
							<p class="text-xs text-red-600">
								⚠️ Gemini keys typically start with "AI" or "AIza".
							</p>
						{/if}
					</div>
				</CardContent>
			</Card>

			<!-- Save Button -->
			<div class="flex justify-end gap-4">
				<Button type="button" variant="outline" onclick={() => window.history.back()}>
					Cancel
				</Button>
				<Button type="submit" disabled={saving}>
					{saving ? 'Saving...' : 'Save Settings'}
				</Button>
			</div>
		</div>
	</form>
</div>
