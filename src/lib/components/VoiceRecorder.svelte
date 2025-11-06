<script lang="ts">
	import { onMount } from 'svelte';

	let { onTranscript = (text: string) => {} } = $props();

	let isRecording = $state(false);
	let transcript = $state('');
	let recognition: any = null; // Use any to avoid type issues
	let isSupported = $state(false);

	onMount(() => {
		// Check if Web Speech API is supported
		const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
		if (SpeechRecognition) {
			isSupported = true;
			recognition = new SpeechRecognition();
			recognition.continuous = true;
			recognition.interimResults = true;
			recognition.lang = 'en-US';

			recognition.onresult = (event: any) => {
				let finalTranscript = '';
				let interimTranscript = '';

				for (let i = event.resultIndex; i < event.results.length; i++) {
					const result = event.results[i];
					if (result.isFinal) {
						finalTranscript += result[0].transcript;
					} else {
						interimTranscript += result[0].transcript;
					}
				}

				transcript = finalTranscript + interimTranscript;
				onTranscript(transcript);
			};

			recognition.onerror = (event: any) => {
				console.error('Speech recognition error:', event.error);
				isRecording = false;
			};

			recognition.onend = () => {
				isRecording = false;
			};
		}
	});

	function startRecording() {
		if (recognition && !isRecording) {
			transcript = '';
			recognition.start();
			isRecording = true;
		}
	}

	function stopRecording() {
		if (recognition && isRecording) {
			recognition.stop();
			isRecording = false;
		}
	}

	function clearTranscript() {
		transcript = '';
		onTranscript('');
	}
</script>

{#if isSupported}
	<div class="voice-recorder space-y-4">
		<div class="flex items-center gap-3">
			<button
				onclick={isRecording ? stopRecording : startRecording}
				class="flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors {isRecording
					? 'bg-red-600 text-white hover:bg-red-700'
					: 'bg-blue-600 text-white hover:bg-blue-700'}"
				disabled={!isSupported}
			>
				{#if isRecording}
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd" />
					</svg>
					Stop Recording
				{:else}
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clip-rule="evenodd" />
					</svg>
					Start Recording
				{/if}
			</button>

			{#if transcript}
				<button
					onclick={clearTranscript}
					class="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
				>
					Clear
				</button>
			{/if}
		</div>

		{#if transcript}
			<div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
				<h4 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Transcript:</h4>
				<p class="text-gray-900 dark:text-white">{transcript}</p>
			</div>
		{/if}

		{#if isRecording}
			<div class="flex items-center gap-2 text-red-600 dark:text-red-400">
				<div class="h-3 w-3 animate-pulse rounded-full bg-red-600"></div>
				<span class="text-sm font-medium">Recording...</span>
			</div>
		{/if}
	</div>
{:else}
	<div class="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
		<div class="flex items-center gap-2">
			<svg class="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
			</svg>
			<span class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
				Voice recording is not supported in this browser. Try Chrome, Edge, or Safari.
			</span>
		</div>
	</div>
{/if}

<style>
	.voice-recorder {
		max-width: 600px;
	}
</style>