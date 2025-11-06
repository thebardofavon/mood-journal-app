<script lang="ts">
	// import { safeHtml } from '$lib/actions/safeHtml';
	let { data } = $props();
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import TemplateSelector from '$lib/components/TemplateSelector.svelte';

	import { browser } from '$app/environment';
	let Purify: typeof DOMPurify | null = null;
	if (browser) {
		import('dompurify').then((m) => (Purify = m.default));
	}

	// Define entry type
	type Entry = {
		id: string;
		userId?: string; // optional for optimistic entries
		content: string;
		mood: string;
		createdAt: string | Date;
		updatedAt?: string | Date; // optional for optimistic entries
		local?: boolean; // optional for optimistic entries
		html?: string; // sanitized HTML for display
	};

	// Local UI state
	let content = $state('');
	let mood = $state('neutral');
	let attachments = $state<Array<{ url: string; type: string }>>([]);
	// Local optimistic entries to show immediately after submit
	let localEntries = $state<Array<Entry>>([]);
	let serverEntries = $state<Array<Entry>>(Array.isArray(data?.entries) ? data.entries : []);
	let message = $state('');
	// Filter shown entries by mood
	let filterMood = $state('all');
	let searchQuery = $state('');
	let currentPage = $state(1);
	const entriesPerPage = 10;
	let uploading = $state(false);
	let submitting = $state(false);
	let deleting = $state<Set<string>>(new Set());
	// Editing state
	let editingId = $state<string | null>(null);
	let editContent = $state('');
	let editMood = $state('neutral');
	let dragOver = $state(false);

	// Autosave functionality
	const AUTOSAVE_KEY = 'journal-draft';
	function saveDraft() {
		if (browser) {
			localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ content, mood, timestamp: Date.now() }));
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
						mood = draft.mood || 'neutral';
					} else {
						// Clear old draft
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

	// Load draft on mount
	if (browser) {
		loadDraft();
	}

	// Autosave on changes
	$effect(() => {
		if (content || mood !== 'neutral') {
			saveDraft();
		}
	});
	const combined = $derived.by(() => [...localEntries, ...serverEntries]);
	const shown = $derived.by(() => {
		let filtered = combined;
		if (filterMood !== 'all') {
			filtered = filtered.filter((e) => e.mood === filterMood);
		}
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(e) => e.content.toLowerCase().includes(query) || e.mood.toLowerCase().includes(query)
			);
		}
		return filtered;
	});

	const paginatedEntries = $derived.by(() => {
		const start = (currentPage - 1) * entriesPerPage;
		const end = start + entriesPerPage;
		return shown.slice(start, end);
	});

	const totalPages = $derived.by(() => Math.ceil(shown.length / entriesPerPage));

	// Reset to page 1 when filters change
	$effect(() => {
		// re-run when filterMood or searchQuery changes
		const dep = `${filterMood}:${searchQuery}`;
		if (dep != null) {
			currentPage = 1;
		}
	});

	// Format relative time
	function formatRelativeTime(date: Date | string) {
		const now = new Date();
		const entryDate = new Date(date);
		const diffMs = now.getTime() - entryDate.getTime();
		const diffMinutes = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffMinutes < 1) return 'Just now';
		if (diffMinutes < 60) return `${diffMinutes}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;

		return entryDate.toLocaleDateString();
	}

	// Handle create with optimistic UI via form submit to ?/create
	async function handleCreateSubmit(e: SubmitEvent) {
		e.preventDefault();
		submitting = true;
		const formEl = e.currentTarget as HTMLFormElement;
		const fd = new FormData(formEl);
		// optimistic entry
		const optimistic: Entry = {
			id: 'local-' + crypto.randomUUID(),
			content: String(fd.get('content') || content),
			mood: String(fd.get('mood') || mood),
			createdAt: new Date().toISOString(),
			local: true
		};
		localEntries = [optimistic, ...localEntries];
		try {
			const res = await fetch('?/create', {
				method: 'POST',
				body: fd,
				headers: { Accept: 'application/json' }
			});
			if (!res.ok) throw new Error('create_failed');
			const body = await res.json();
			if (body?.ok) {
				// reset editor state
				content = '';
				mood = 'neutral';
				attachments = [];
				clearDraft();
				// merge optimistic into server list (could also refetch)
				serverEntries = [
					{
						id: body.id,
						userId: '', // will be set by server
						content: optimistic.content,
						mood: optimistic.mood,
						html: sanitize(String(marked.parse(optimistic.content))),
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					},
					...serverEntries
				];
				localEntries = [];
			} else {
				message = body?.error || 'Save failed';
			}
		} catch (err) {
			console.error(err);
			message = 'Save failed';
		} finally {
			submitting = false;
		}
	}

	// Sanitize rendered markdown using DOMPurify (browser only)
	function sanitize(html: string) {
		if (browser && Purify?.sanitize) {
			return Purify.sanitize(html, {
				ADD_TAGS: ['audio', 'source'],
				ADD_ATTR: ['controls', 'src']
			});
		}
		// If DOMPurify not available, return as-is (should not happen in browser)
		return html;
	}

	// Process HTML for entries to make images smaller
	function processEntryHtml(html: string) {
		return html.replace(
			/<img([^>]+)>/g,
			'<img$1 class="max-w-full h-auto rounded border border-slate-200 dark:border-slate-700">'
		);
	}

	let previewHtml = $derived.by(() => sanitize(String(marked.parse(content || ''))));

	// Insert markdown at cursor in the textarea
	function insertAtCursor(el: HTMLTextAreaElement, insertText: string) {
		const start = el.selectionStart || 0;
		const end = el.selectionEnd || 0;
		const before = el.value.substring(0, start);
		const after = el.value.substring(end);
		el.value = before + insertText + after;
		const pos = start + insertText.length;
		el.selectionStart = el.selectionEnd = pos;
		// update bound value
		content = el.value;
		el.focus();
	}

	// Helpers for editor-like behavior
	function getTA() {
		return document.getElementById('content') as HTMLTextAreaElement | null;
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
		const target = selected || '';
		const lines = target.split('\n');
		const modified = (target ? lines : ['']).map((l) => `${prefix}${l}`).join('\n');
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
		// place cursor on url
		const urlStart = (before + `[${selected}](`).length;
		const urlEnd = urlStart + 3; // 'url'
		ta.selectionStart = urlStart;
		ta.selectionEnd = urlEnd;
		ta.focus();
	}

	// Handle template selection
	function handleTemplateSelect(templateContent: string) {
		content = templateContent;
		const ta = getTA();
		if (ta) {
			ta.focus();
		}
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

	// Upload attachments to /journal/upload
	async function handleUpload(files: FileList | null) {
		if (!files || files.length === 0) return;
		uploading = true;
		const maxSize = 10 * 1024 * 1024; // 10MB client-side limit
		const fd = new FormData();
		for (const f of Array.from(files)) {
			if (f.size > maxSize) continue;
			fd.append('file', f);
		}
		try {
			const res = await fetch('/journal/upload', { method: 'POST', body: fd });
			if (!res.ok) throw new Error('upload failed');
			const body = await res.json();
			// Expect body to be { ok: true, files: [{ url, type }] }
			if (body?.files) {
				attachments = attachments.concat(body.files);
				// Append uploaded files into the editor content so they are persisted in the entry
				for (const f of body.files) {
					if (f.type && f.type.startsWith('image/')) {
						content += `\n\n![](${f.url})\n\n`;
					} else if (f.type && f.type.startsWith('audio/')) {
						// HTML audio is supported by marked (it will render raw HTML)
						content += `\n\n<audio controls src="${f.url}"></audio>\n\n`;
					} else {
						content += `\n\n[attachment](${f.url})\n\n`;
					}
				}
			}
		} catch (err) {
			console.error('upload error', err);
			message = 'Upload failed';
		} finally {
			uploading = false;
		}
	}

	// Delete an entry by POSTing to the delete handler
	async function deleteEntry(id: string) {
		deleting.add(id);
		const fd = new FormData();
		fd.append('id', id);
		try {
			const res = await fetch('/journal/entry/delete', { method: 'POST', body: fd });
			const body = await res.json();
			if (body?.ok) {
				// remove from local optimistic entries and request update
				localEntries = localEntries.filter((e) => e.id !== id);
				// trigger server refetch (no-op placeholder)
				message = 'Deleted';
			} else {
				message = body?.error || 'Delete failed';
			}
		} catch (err) {
			console.error('delete failed', err);
			message = 'Delete failed';
		} finally {
			deleting.delete(id);
		}
	}

	// Drag and drop handlers
	function onDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function onDragLeave(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const files = e.dataTransfer?.files;
		if (files) {
			handleUpload(files);
		}
	}

	// Inline editing functions
	function startEditing(entry: Entry) {
		editingId = entry.id;
		editContent = entry.content;
		editMood = entry.mood;
	}

	function cancelEditing() {
		editingId = null;
		editContent = '';
		editMood = 'neutral';
	}

	async function saveEdit() {
		if (!editingId) return;
		const fd = new FormData();
		fd.append('id', editingId);
		fd.append('content', editContent);
		fd.append('mood', editMood);
		try {
			const res = await fetch('/journal/entry/update', { method: 'POST', body: fd });
			const body = await res.json();
			if (body?.ok) {
				// Update the entry in the list
				serverEntries = serverEntries.map((entry) =>
					entry.id === editingId
						? {
								...entry,
								content: editContent,
								mood: editMood,
								html: sanitize(String(marked.parse(editContent))),
								updated_at: new Date().toISOString()
							}
						: entry
				);
				localEntries = localEntries.map((entry) =>
					entry.id === editingId
						? {
								...entry,
								content: editContent,
								mood: editMood,
								html: sanitize(String(marked.parse(editContent))),
								updated_at: new Date().toISOString()
							}
						: entry
				);
				cancelEditing();
				message = 'Entry updated';
			} else {
				message = body?.error || 'Update failed';
			}
		} catch (err) {
			console.error('update failed', err);
			message = 'Update failed';
		}
	}
</script>

<main class="px-4 py-6 md:px-6">
	<div class="mx-auto max-w-5xl">
		<!-- Header with Navigation -->
		<div class="mb-6 flex items-center justify-between">
			<h1 class="text-2xl font-semibold tracking-tight">Journal</h1>
			<div class="flex gap-2">
				<a
					href="/journal/analytics"
					class="border-border bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
				>
					<span>📊</span>
					<span>Analytics</span>
				</a>
				<a
					href="/journal/search"
					class="border-border bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
				>
					<span>🔍</span>
					<span>Search</span>
				</a>
				<a
					href="/journal/export"
					class="border-border bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
				>
					<span>📥</span>
					<span>Export</span>
				</a>
			</div>
		</div>

		<form
			method="post"
			action="?/create"
			onsubmit={handleCreateSubmit}
			ondragover={onDragOver}
			ondragleave={onDragLeave}
			ondrop={onDrop}
			class="bg-card space-y-4 rounded-xl border p-4 {dragOver
				? 'border-primary'
				: 'border-border'} transition-colors"
		>
			{#if message}
				<div
					class="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
				>
					{message}
				</div>
			{/if}
			{#if dragOver}
				<div
					class="border-primary/50 bg-accent text-foreground rounded-md border px-3 py-2 text-center text-sm"
				>
					Drop files here to upload
				</div>
			{/if}
			{#if uploading}
				<div class="flex items-center gap-2">
					<div class="bg-secondary h-2 flex-1 rounded-full">
						<div class="bg-primary h-full w-full animate-pulse rounded-full"></div>
					</div>
					<span class="text-muted-foreground text-sm">Uploading...</span>
				</div>
			{/if}
			<div class="flex flex-wrap gap-2">
				<div
					class="border-border bg-background inline-flex items-center gap-1 rounded-md border p-1 shadow-sm"
				>
					<button
						type="button"
						title="Bold (⌘/Ctrl+B)"
						aria-label="Bold"
						class="hover:bg-accent hover:text-accent-foreground inline-flex h-8 w-8 items-center justify-center rounded"
						onclick={() => wrapSelection('**', '**')}
					>
						<span class="font-semibold">B</span>
					</button>
					<button
						type="button"
						title="Italic (⌘/Ctrl+I)"
						aria-label="Italic"
						class="hover:bg-accent hover:text-accent-foreground inline-flex h-8 w-8 items-center justify-center rounded"
						onclick={() => wrapSelection('*', '*')}
					>
						<span class="italic">I</span>
					</button>
					<button
						type="button"
						title="Inline code"
						aria-label="Inline code"
						class="hover:bg-accent hover:text-accent-foreground inline-flex h-8 w-8 items-center justify-center rounded"
						onclick={() => wrapSelection('`', '`')}
					>
						<span class="font-mono text-xs">`</span>
					</button>
					<button
						type="button"
						title="Code block"
						aria-label="Code block"
						class="hover:bg-accent hover:text-accent-foreground inline-flex h-8 w-8 items-center justify-center rounded"
						onclick={insertCodeBlock}
					>
						<svg
							viewBox="0 0 24 24"
							class="h-4 w-4"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"><path d="M9 18l-6-6 6-6" /><path d="M15 6l6 6-6 6" /></svg
						>
					</button>
					<button
						type="button"
						title="Heading"
						aria-label="Heading"
						class="hover:bg-accent hover:text-accent-foreground inline-flex h-8 w-8 items-center justify-center rounded"
						onclick={() => insertAtCursor(getTA()!, '# ')}
					>
						<span class="text-sm font-semibold">H</span>
					</button>
					<button
						type="button"
						title="Bullet list"
						aria-label="Bullet list"
						class="hover:bg-accent hover:text-accent-foreground inline-flex h-8 w-8 items-center justify-center rounded"
						onclick={() => insertAtCursor(getTA()!, '- ')}
					>
						<span class="text-sm">•</span>
					</button>
					<button
						type="button"
						title="Link"
						aria-label="Link"
						class="hover:bg-accent hover:text-accent-foreground inline-flex h-8 w-8 items-center justify-center rounded"
						onclick={insertLink}
					>
						<svg
							viewBox="0 0 24 24"
							class="h-4 w-4"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path
								d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
							/></svg
						>
					</button>
					<button
						type="button"
						title="Horizontal rule"
						aria-label="Horizontal rule"
						class="hover:bg-accent hover:text-accent-foreground inline-flex h-8 w-8 items-center justify-center rounded"
						onclick={insertHorizontalRule}
					>
						<span class="text-sm">—</span>
					</button>
				</div>
				<div
					class="border-border bg-background inline-flex items-center gap-1 rounded-md border p-1 shadow-sm"
				>
					<button
						type="button"
						title="Heading 1"
						aria-label="Heading 1"
						class="hover:bg-accent hover:text-accent-foreground inline-flex h-8 items-center justify-center rounded px-2"
						onclick={() => addLinePrefix('# ')}>H1</button
					>
					<button
						type="button"
						title="Heading 2"
						aria-label="Heading 2"
						class="hover:bg-accent hover:text-accent-foreground inline-flex h-8 items-center justify-center rounded px-2"
						onclick={() => addLinePrefix('## ')}>H2</button
					>
					<button
						type="button"
						title="Quote"
						aria-label="Quote"
						class="hover:bg-accent hover:text-accent-foreground inline-flex h-8 w-8 items-center justify-center rounded"
						onclick={() => addLinePrefix('> ')}
					>
						<svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor"
							><path
								d="M7.17 6A4.17 4.17 0 003 10.17V18h6v-7.83A4.17 4.17 0 007.17 6zM17.17 6A4.17 4.17 0 0013 10.17V18h6v-7.83A4.17 4.17 0 0017.17 6z"
							/></svg
						>
					</button>
					<button
						type="button"
						title="Bulleted list"
						aria-label="Bulleted list"
						class="hover:bg-accent hover:text-accent-foreground inline-flex h-8 w-8 items-center justify-center rounded"
						onclick={() => addLinePrefix('- ')}
					>
						<svg
							viewBox="0 0 24 24"
							class="h-4 w-4"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="4" cy="6" r="1.5" /><circle
								cx="4"
								cy="12"
								r="1.5"
							/><circle cx="4" cy="18" r="1.5" /></svg
						>
					</button>
				</div>
				<div
					class="border-border bg-background inline-flex items-center gap-1 rounded-md border p-1 shadow-sm"
				>
					<button
						type="button"
						title="Link"
						aria-label="Link"
						class="hover:bg-accent hover:text-accent-foreground inline-flex h-8 w-8 items-center justify-center rounded"
						onclick={insertLink}
					>
						<svg
							viewBox="0 0 24 24"
							class="h-4 w-4"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><path d="M10 13a5 5 0 007.07 0l1.41-1.41a5 5 0 10-7.07-7.07L10 5" /><path
								d="M14 11a5 5 0 01-7.07 0L5.5 9.57a5 5 0 017.07-7.07L14 4"
							/></svg
						>
					</button>
					<button
						type="button"
						title="Horizontal rule"
						aria-label="Horizontal rule"
						class="hover:bg-accent hover:text-accent-foreground inline-flex h-8 w-8 items-center justify-center rounded"
						onclick={insertHorizontalRule}
					>
						<svg
							viewBox="0 0 24 24"
							class="h-4 w-4"
							fill="none"
							stroke="currentColor"
							stroke-width="2"><path d="M4 12h16" /></svg
						>
					</button>
				</div>
			</div>
			<div>
				<label for="content" class="mb-1 block text-sm font-medium">Entry</label>
				<textarea
					id="content"
					name="content"
					bind:value={content}
					rows={8}
					class="border-input !bg-muted !text-foreground focus-visible:ring-ring placeholder:text-muted-foreground w-full rounded-md border p-3 font-mono text-sm leading-6 shadow-sm focus-visible:ring-2 focus-visible:outline-none"
					placeholder="Write your thoughts in markdown..."
					onkeydown={onEditorKeyDown}
				></textarea>
			</div>

			<div class="flex flex-wrap items-center gap-3">
				<label for="mood" class="text-sm font-medium">Mood</label>
				<select
					id="mood"
					name="mood"
					bind:value={mood}
					class="border-input !bg-muted !text-foreground focus-visible:ring-ring w-40 rounded-md border p-1.5 pr-8 text-sm shadow-sm focus-visible:ring-2 focus-visible:outline-none"
				>
					<option value="happy">Happy</option>
					<option value="neutral">Neutral</option>
					<option value="sad">Sad</option>
					<option value="anxious">Anxious</option>
				</select>
				<TemplateSelector onSelectTemplate={handleTemplateSelect} />
				<label
					class="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors"
				>
					<input
						type="file"
						class="hidden"
						multiple
						onchange={(e) => handleUpload((e.target as HTMLInputElement).files)}
					/>
					<span>Browse files…</span>
				</label>
				<div class="grow"></div>
				<button
					type="submit"
					disabled={submitting}
					class="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 font-medium shadow transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if submitting}
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
						></div>
					{/if}
					{submitting ? 'Saving...' : 'Save'}
				</button>
			</div>

			<div class="text-muted-foreground text-xs">Attachments: {attachments.length}</div>
		</form>

		<section class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
			<div>
				<h2 class="mb-2 font-semibold">Preview</h2>
				<div
					class="border-border bg-card prose prose-sm min-h-[200px] max-w-none rounded-lg border p-4 prose-zinc dark:prose-invert"
				>
					{#if content.trim()}
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html previewHtml}
					{:else}
						<p class="text-muted-foreground italic">Start typing to see preview...</p>
					{/if}
				</div>
				{#if attachments.length}
					<div class="mt-2">
						<div class="text-muted-foreground mb-2 text-sm">
							Attachments ({attachments.length})
						</div>
						<div class="flex flex-wrap gap-2">
							{#each attachments as a (a.url)}
								{#if a.type.startsWith('image/')}
									<div class="relative">
										<img
											src={a.url}
											alt="attachment"
											class="border-border h-16 w-16 rounded border object-cover"
										/>
										<button
											type="button"
											class="bg-destructive text-destructive-foreground hover:bg-destructive/90 absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs"
											onclick={() => (attachments = attachments.filter((att) => att.url !== a.url))}
											title="Remove">×</button
										>
									</div>
								{:else if a.type.startsWith('audio/')}
									<div class="border-border bg-muted flex items-center gap-2 rounded border p-2">
										<audio controls src={a.url} class="h-8 w-32"></audio>
										<button
											type="button"
											class="text-destructive hover:text-destructive/90 text-sm"
											onclick={() => (attachments = attachments.filter((att) => att.url !== a.url))}
											title="Remove">Remove</button
										>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<div>
				<h2 class="mb-2 flex items-center justify-between font-semibold">
					Recent entries
					<div class="flex gap-2">
						<input
							type="search"
							placeholder="Search entries..."
							bind:value={searchQuery}
							class="border-input !bg-muted !text-foreground focus-visible:ring-ring placeholder:text-muted-foreground w-48 rounded-md border p-1.5 text-sm shadow-sm focus-visible:ring-2 focus-visible:outline-none"
							aria-label="Search entries"
						/>
						<select
							bind:value={filterMood}
							class="border-input !bg-muted !text-foreground focus-visible:ring-ring w-40 rounded-md border p-1.5 pr-8 text-sm shadow-sm focus-visible:ring-2 focus-visible:outline-none"
							aria-label="Filter by mood"
						>
							<option value="all">All moods</option>
							<option value="happy">Happy</option>
							<option value="neutral">Neutral</option>
							<option value="sad">Sad</option>
							<option value="anxious">Anxious</option>
						</select>
					</div>
				</h2>
				{#if paginatedEntries?.length}
					<ul class="space-y-3">
						{#each paginatedEntries as it (it.id)}
							<li class="border-border bg-card rounded-lg border p-3">
								<div class="flex items-start justify-between">
									<div class="text-muted-foreground text-sm">
										{formatRelativeTime(it.createdAt)} — {it.mood}
									</div>
									<div class="flex gap-2">
										{#if it.local}
											<span class="text-muted-foreground text-xs">pending</span>
										{:else if editingId === it.id}
											<button type="button" class="text-sm hover:underline" onclick={saveEdit}
												>Save</button
											>
											<button
												type="button"
												class="text-muted-foreground text-sm hover:underline"
												onclick={cancelEditing}>Cancel</button
											>
										{:else}
											<button
												type="button"
												class="text-sm hover:underline"
												onclick={() => startEditing(it)}>Edit</button
											>
											<button
												type="button"
												class="text-destructive text-sm hover:underline disabled:cursor-not-allowed disabled:opacity-50"
												disabled={deleting.has(it.id)}
												onclick={() => deleteEntry(it.id)}
											>
												{deleting.has(it.id) ? 'Deleting...' : 'Delete'}
											</button>
										{/if}
									</div>
								</div>
								{#if editingId === it.id}
									<div class="mt-2 space-y-2">
										<textarea
											bind:value={editContent}
											rows={4}
											class="border-input !bg-muted !text-foreground focus-visible:ring-ring placeholder:text-muted-foreground w-full rounded-md border p-3 font-mono text-sm leading-6 shadow-sm focus-visible:ring-2 focus-visible:outline-none"
										></textarea>
										<select
											bind:value={editMood}
											class="border-input !bg-muted !text-foreground focus-visible:ring-ring w-40 rounded-md border p-1.5 pr-8 text-sm shadow-sm focus-visible:ring-2 focus-visible:outline-none"
										>
											<option value="happy">Happy</option>
											<option value="neutral">Neutral</option>
											<option value="sad">Sad</option>
											<option value="anxious">Anxious</option>
										</select>
									</div>
								{:else}
									<div class="prose prose-sm mt-2 max-w-none prose-zinc dark:prose-invert">
										<!-- eslint-disable-next-line svelte/no-at-html-tags -->
										{@html processEntryHtml(
											it.html || sanitize(String(marked.parse(it.content || '')))
										)}
									</div>
								{/if}
							</li>
						{/each}
					</ul>
					{#if totalPages > 1}
						<div class="mt-4 flex items-center justify-between">
							<div class="text-muted-foreground text-sm">
								Showing {(currentPage - 1) * entriesPerPage + 1} to {Math.min(
									currentPage * entriesPerPage,
									shown.length
								)} of {shown.length} entries
							</div>
							<div class="flex gap-1">
								<button
									type="button"
									class="border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md border px-3 py-1 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
									disabled={currentPage === 1}
									onclick={() => currentPage--}
									aria-label="Previous page"
								>
									Previous
								</button>
								<span class="text-muted-foreground px-3 py-1 text-sm">
									Page {currentPage} of {totalPages}
								</span>
								<button
									type="button"
									class="border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md border px-3 py-1 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
									disabled={currentPage === totalPages}
									onclick={() => currentPage++}
									aria-label="Next page"
								>
									Next
								</button>
							</div>
						</div>
					{/if}
				{:else}
					<div
						class="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm"
					>
						No entries yet.
					</div>
				{/if}
			</div>
		</section>
	</div>
</main>
