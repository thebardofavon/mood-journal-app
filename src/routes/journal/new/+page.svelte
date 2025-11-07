<script lang="ts">
	import { enhance } from '$app/forms';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import { browser } from '$app/environment';
	import TemplateSelector from '$lib/components/TemplateSelector.svelte';
	import { safeHtml } from '$lib/actions/safeHtml';
	import VoiceRecorder from '$lib/components/VoiceRecorder.svelte';
	import { achievementNotifications } from '$lib/stores/achievements';

	let { data, form } = $props();

	let Purify: typeof DOMPurify | null = null;
	if (browser) {
		import('dompurify').then((m) => (Purify = m.default));
	}

	// Form state
	let content = $state('');
	// Note: mood is now auto-generated from NLP sentiment analysis, not user input
	let attachments = $state<Array<{ url: string; type: string }>>([]);
	let uploading = $state(false);
	let submitting = $state(false);
	let dragOver = $state(false);
	let showPrompts = $state(false);
	let currentPrompt = $state('');

	// Prompt categories
	const promptCategories = [
		'Gratitude',
		'Self-Reflection',
		'Mindfulness',
		'Goals & Intentions',
		'Processing Emotions'
	];

	// Autosave functionality
	const AUTOSAVE_KEY = 'journal-draft';
	function saveDraft() {
		if (browser) {
			localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ content, timestamp: Date.now() }));
		}
	}
	function loadDraft() {
		if (browser) {
			try {
				const saved = localStorage.getItem(AUTOSAVE_KEY);
				if (saved) {
				const draft = JSON.parse(saved);
				// Only restore if it's recent (within 24 hours)
				if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
					content = draft.content || '';
					// mood is now auto-generated from sentiment, not restored from draft
				} else {
						localStorage.removeItem(AUTOSAVE_KEY);
					}
				}
			} catch (e) {
				console.error('Failed to load draft', e);
			}
		}
	}
	function clearDraft() {
		if (browser) {
			localStorage.removeItem(AUTOSAVE_KEY);
		}
	}

	function handleVoiceTranscript(transcript: string) {
		if (transcript && transcript.trim()) {
			// Append transcript to existing content
			content = content ? content + '\n\n' + transcript : transcript;
		}
	}

	async function getPrompt() {
		try {
			const response = await fetch('/api/prompts/random');
			if (response.ok) {
				const data = await response.json();
				currentPrompt = data.prompt;
				showPrompts = true;
			}
		} catch (error) {
			console.error('Failed to fetch prompt:', error);
		}
	}

	function usePrompt() {
		if (currentPrompt) {
			content = content ? content + '\n\n' + currentPrompt + '\n\n' : currentPrompt + '\n\n';
			showPrompts = false;
		}
	}

	// Load draft on mount
	if (browser) {
		loadDraft();
	}

	// Autosave on changes
	$effect(() => {
		if (content) {
			saveDraft();
		}
	});

	// Sanitize rendered markdown
	function sanitize(html: string) {
		if (browser && Purify?.sanitize) {
			return Purify.sanitize(html, {
				ADD_TAGS: ['audio', 'source'],
				ADD_ATTR: ['controls', 'src']
			});
		}
		return html;
	}

	let previewHtml = $derived.by(() => sanitize(String(marked.parse(content || ''))));

	// Editor helpers
	function getTA() {
		return document.getElementById('content') as HTMLTextAreaElement | null;
	}

	function insertAtCursor(el: HTMLTextAreaElement, insertText: string) {
		const start = el.selectionStart || 0;
		const end = el.selectionEnd || 0;
		const before = el.value.substring(0, start);
		const after = el.value.substring(end);
		el.value = before + insertText + after;
		const pos = start + insertText.length;
		el.selectionStart = el.selectionEnd = pos;
		content = el.value;
		el.focus();
	}

	function wrapSelection(prefix: string, suffix: string = prefix) {
		const ta = getTA();
		if (!ta) return;
		const start = ta.selectionStart ?? 0;
		const end = ta.selectionEnd ?? 0;
		const selected = ta.value.slice(start, end);
		const hasSel = end > start;
		const inserted = hasSel ? `${prefix}${selected}${suffix}` : `${prefix}${suffix}`;
		const before = ta.value.slice(0, start);
		const after = ta.value.slice(end);
		ta.value = before + inserted + after;
		content = ta.value;
		ta.focus();
		if (hasSel) {
			ta.selectionStart = before.length + prefix.length;
			ta.selectionEnd = before.length + prefix.length + selected.length;
		} else {
			ta.selectionStart = ta.selectionEnd = before.length + prefix.length;
		}
	}

	function addLinePrefix(prefix: string) {
		const ta = getTA();
		if (!ta) return;
		const start = ta.selectionStart ?? 0;
		const end = ta.selectionEnd ?? 0;
		const before = ta.value.slice(0, start);
		const selected = ta.value.slice(start, end);
		const after = ta.value.slice(end);
		const lines = (selected || '').split('\n');
		const modified = (selected ? lines : ['']).map((l) => `${prefix}${l}`).join('\n');
		ta.value = before + modified + after;
		content = ta.value;
		const caret = (before + modified).length;
		ta.selectionStart = ta.selectionEnd = caret;
		ta.focus();
	}

	function insertCodeBlock() {
		const ta = getTA();
		if (!ta) return;
		const start = ta.selectionStart ?? 0;
		const end = ta.selectionEnd ?? 0;
		const selected = ta.value.slice(start, end) || 'code';
		const before = ta.value.slice(0, start);
		const after = ta.value.slice(end);
		const block = `\n\n\`\`\`\n${selected}\n\`\`\`\n\n`;
		ta.value = before + block + after;
		content = ta.value;
		const pos = (before + block).length;
		ta.selectionStart = ta.selectionEnd = pos;
		ta.focus();
	}

	function insertHorizontalRule() {
		const ta = getTA();
		if (!ta) return;
		insertAtCursor(ta, '\n\n---\n\n');
	}

	function insertLink() {
		const ta = getTA();
		if (!ta) return;
		const start = ta.selectionStart ?? 0;
		const end = ta.selectionEnd ?? 0;
		const selected = ta.value.slice(start, end) || 'text';
		const before = ta.value.slice(0, start);
		const after = ta.value.slice(end);
		const snippet = `[${selected}](url)`;
		ta.value = before + snippet + after;
		content = ta.value;
		const urlStart = (before + `[${selected}](`).length;
		const urlEnd = urlStart + 3;
		ta.selectionStart = urlStart;
		ta.selectionEnd = urlEnd;
		ta.focus();
	}

	function handleTemplateSelect(templateContent: string) {
		content = templateContent;
		const ta = getTA();
		if (ta) ta.focus();
	}

	function onEditorKeyDown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
			e.preventDefault();
			wrapSelection('**', '**');
		} else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
			e.preventDefault();
			wrapSelection('*', '*');
		} else if (e.key === 'Tab') {
			e.preventDefault();
			const ta = getTA();
			if (!ta) return;
			insertAtCursor(ta, '  ');
		}
	}

	async function handleUpload(files: FileList | null) {
		if (!files || files.length === 0) return;
		uploading = true;
		const maxSize = 10 * 1024 * 1024;
		const fd = new FormData();
		for (const f of Array.from(files)) {
			if (f.size > maxSize) continue;
			fd.append('file', f);
		}
		try {
			const res = await fetch('/journal/upload', { method: 'POST', body: fd });
			if (!res.ok) throw new Error('upload failed');
			const body = await res.json();
			if (body?.files) {
				attachments = attachments.concat(body.files);
				for (const f of body.files) {
					if (f.type && f.type.startsWith('image/')) {
						content += `\n\n![](${f.url})\n\n`;
					} else if (f.type && f.type.startsWith('audio/')) {
						content += `\n\n<audio controls src="${f.url}"></audio>\n\n`;
					} else {
						content += `\n\n[attachment](${f.url})\n\n`;
					}
				}
			}
		} catch (err) {
			console.error('upload error', err);
		} finally {
			uploading = false;
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function handleDragLeave() {
		dragOver = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		if (e.dataTransfer?.files) {
			handleUpload(e.dataTransfer.files);
		}
	}
</script>

<svelte:head>
	<title>New Entry | Mood Journal</title>
</svelte:head>

<div class="bg-background min-h-screen">
	<div class="mx-auto max-w-5xl px-4 py-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="mb-4 flex items-center gap-4">
				<a
					href="/journal"
					class="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
				>
					← Back to Journal
				</a>
			</div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">New Entry</h1>
			<p class="mt-2 text-gray-600 dark:text-gray-400">Write your thoughts for today</p>
		</div>

		{#if form?.error}
			<div class="mb-6 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
				{form.error}
			</div>
		{/if}

		<form
			method="POST"
			use:enhance={() => {
				submitting = true;
				return async ({ result, update }) => {
					await update();
					submitting = false;
					clearDraft();
					
					// Show achievement notifications if any were unlocked
					if (result.type === 'success' && result.data?.newlyUnlocked) {
						for (const achievement of result.data.newlyUnlocked) {
							achievementNotifications.addNotification({
								id: achievement.id,
								title: achievement.title,
								description: achievement.description,
								icon: achievement.icon,
								xp: achievement.xp
							});
						}
					}
				};
			}}
		>
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<!-- Editor Section -->
				<div class="space-y-6">
					<!-- Journaling Prompt -->
					<div class="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
						<div class="mb-4 flex items-center justify-between">
							<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
								Need Inspiration?
							</h2>
							<button
								type="button"
								onclick={getPrompt}
								class="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
							>
								Get Prompt
							</button>
						</div>
						{#if showPrompts && currentPrompt}
							<div class="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
								<p class="mb-3 text-gray-700 dark:text-gray-300">{currentPrompt}</p>
								<div class="flex gap-2">
									<button
										type="button"
										onclick={usePrompt}
										class="rounded bg-purple-600 px-3 py-1 text-sm text-white hover:bg-purple-700"
									>
										Use This
									</button>
									<button
										type="button"
										onclick={getPrompt}
										class="rounded bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
									>
										Get Another
									</button>
								</div>
							</div>
						{/if}
					</div>

					<!-- Template Selector -->
					<div class="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
						<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
							Start with a Template
						</h2>
						<TemplateSelector onSelectTemplate={handleTemplateSelect} />
					</div>

					<!-- Mood Selector - DISABLED: Mood is now auto-detected by NLP sentiment analysis -->
					<!--
					<div class="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
						<div class="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
							How are you feeling?
						</div>
						<div class="grid grid-cols-3 gap-3 sm:grid-cols-5">
							{#each [
								{ value: 'happy', emoji: '😊' },
								{ value: 'neutral', emoji: '😐' },
								{ value: 'sad', emoji: '😢' },
								{ value: 'anxious', emoji: '😰' },
								{ value: 'excited', emoji: '🤩' },
								{ value: 'calm', emoji: '😌' },
								{ value: 'stressed', emoji: '😫' },
								{ value: 'angry', emoji: '😠' },
								{ value: 'other', emoji: '🤔' }
							] as moodOption}
								<button
									type="button"
									onclick={() => (mood = moodOption.value)}
									class="flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all {mood ===
									moodOption.value
										? 'border-gray-900 bg-gray-100 dark:border-white dark:bg-gray-800'
										: 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}"
								>
									<span class="text-3xl">{moodOption.emoji}</span>
									<span class="text-xs font-medium text-gray-700 capitalize dark:text-gray-300"
										>{moodOption.value}</span
									>
								</button>
							{/each}
						</div>
						<input type="hidden" name="mood" value={mood} />
					</div>
					-->

					<!-- Editor -->
					<div class="overflow-hidden rounded-xl bg-white shadow-lg dark:bg-gray-800">
						<div class="border-b border-gray-200 p-4 dark:border-gray-700">
							<div class="flex flex-wrap gap-2">
								<button
									type="button"
									onclick={() => wrapSelection('**')}
									class="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
									title="Bold (Cmd+B)"
								>
									<strong>B</strong>
								</button>
								<button
									type="button"
									onclick={() => wrapSelection('*')}
									class="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
									title="Italic (Cmd+I)"
								>
									<em>I</em>
								</button>
								<button
									type="button"
									onclick={() => addLinePrefix('# ')}
									class="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
									title="Heading"
								>
									H1
								</button>
								<button
									type="button"
									onclick={() => addLinePrefix('- ')}
									class="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
									title="List"
								>
									List
								</button>
								<button
									type="button"
									onclick={insertCodeBlock}
									class="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
									title="Code Block"
								>
									Code
								</button>
								<button
									type="button"
									onclick={insertLink}
									class="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
									title="Link"
								>
									Link
								</button>
								<button
									type="button"
									onclick={insertHorizontalRule}
									class="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
									title="Horizontal Rule"
								>
									HR
								</button>
								<label
									class="cursor-pointer rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
									title="Upload"
								>
									📎
									<input
										type="file"
										class="hidden"
										multiple
										onchange={(e) => handleUpload(e.currentTarget.files)}
									/>
								</label>
							</div>
						</div>
						<div
							role="button"
							tabindex="0"
							ondragover={handleDragOver}
							ondragleave={handleDragLeave}
							ondrop={handleDrop}
							class="relative {dragOver ? 'bg-gray-100 dark:bg-gray-800' : ''}"
						>
							<textarea
								id="content"
								name="content"
								bind:value={content}
								onkeydown={onEditorKeyDown}
								placeholder="Start writing your journal entry... (Markdown supported)"
								class="min-h-[500px] w-full resize-none bg-transparent p-6 text-gray-900 placeholder-gray-400 focus:outline-none dark:text-white"
								required
							></textarea>
							{#if uploading}
								<div
									class="bg-gray-1000 absolute top-4 right-4 rounded-full px-3 py-1 text-sm text-white"
								>
									Uploading...
								</div>
							{/if}
						</div>
					</div>

					<!-- Voice Recorder -->
					<div class="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
						<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Voice Journaling</h3>
						<VoiceRecorder onTranscript={handleVoiceTranscript} />
					</div>

					<!-- Submit Button -->
					<div class="flex gap-4">
						<button
							type="submit"
							disabled={submitting || !content.trim()}
							class="flex-1 rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 dark:disabled:bg-gray-700"
						>
							{submitting ? 'Saving...' : 'Save Entry'}
						</button>
						<a
							href="/journal"
							class="rounded-lg bg-gray-200 px-6 py-3 text-center font-semibold text-gray-900 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
						>
							Cancel
						</a>
					</div>
				</div>

				<!-- Preview Section -->
				<div class="space-y-6">
					<div class="sticky top-8 rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
						<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Preview</h2>
						<div class="prose max-w-none dark:prose-invert" use:safeHtml={content.trim() ? previewHtml : ''}>
							{#if !content.trim()}
								<p class="text-gray-400 italic">Your preview will appear here...</p>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</form>
	</div>
</div>
