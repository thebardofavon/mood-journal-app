<script lang="ts">
	import { onMount } from 'svelte';

	let { onTranscript = (text: string) => {} } = $props();

	let isRecording = $state(false);
	let transcript = $state('');
	let recognition: any = null; // Use any to avoid type issues
	let isSupported = $state(false);
	let error = $state('');
	let interimText = $state('');

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
				let interim = '';

				for (let i = event.resultIndex; i < event.results.length; i++) {
					const result = event.results[i];
					if (result.isFinal) {
						finalTranscript += result[0].transcript + ' ';
					} else {
						interim += result[0].transcript;
					}
				}

				if (finalTranscript) {
					transcript += finalTranscript;
					onTranscript(transcript);
				}
				interimText = interim;
			};

			recognition.onerror = (event: any) => {
				console.error('Speech recognition error:', event.error);
				isRecording = false;
				
				// Show user-friendly error messages
				if (event.error === 'no-speech') {
					error = 'No speech detected. Please try again.';
				} else if (event.error === 'audio-capture') {
					error = 'Microphone not found. Please check your device settings.';
				} else if (event.error === 'not-allowed') {
					error = 'Microphone access denied. Please allow microphone access in your browser settings.';
				} else {
					error = `Error: ${event.error}. Please try again.`;
				}
				
				// Clear error after 5 seconds
				setTimeout(() => (error = ''), 5000);
			};

			recognition.onend = () => {
				isRecording = false;
				interimText = '';
			};
		}
	});

	function startRecording() {
		if (recognition && !isRecording) {
			error = '';
			interimText = '';
			try {
				recognition.start();
				isRecording = true;
			} catch (err) {
				console.error('Failed to start recognition:', err);
				error = 'Failed to start recording. Please try again.';
			}
		}
	}

	function stopRecording() {
		if (recognition && isRecording) {
			recognition.stop();
			isRecording = false;
			interimText = '';
		}
	}

	function clearTranscript() {
		transcript = '';
		interimText = '';
		onTranscript('');
	}
</script>

{#if isSupported}
	<div class="voice-recorder space-y-4">
		<!-- Error Message -->
		{#if error}
			<div class="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
				{error}
			</div>
		{/if}

		<div class="flex items-center gap-3">
			<button
				onclick={isRecording ? stopRecording : startRecording}
				class="flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors {isRecording
					? 'bg-red-600 text-white hover:bg-red-700'
					: 'bg-blue-600 text-white hover:bg-blue-700'}"
				disabled={!isSupported}
			>
				{#if isRecording}
					<!-- Recording Animation -->
					<div class="flex items-center gap-2">
						<span class="relative flex h-3 w-3">
							<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
							<span class="relative inline-flex h-3 w-3 rounded-full bg-white"></span>
						</span>
					</div>
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

		<!-- Transcript Display -->
		{#if transcript || interimText}
			<div class="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
				<div class="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Transcript:</div>
				<div class="text-sm text-gray-700 dark:text-gray-300">
					{transcript}
					{#if interimText}
						<span class="text-gray-400 italic dark:text-gray-500">{interimText}</span>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Status Indicator -->
		{#if isRecording}
			<div class="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
				<span class="relative flex h-2 w-2">
					<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
					<span class="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
				</span>
				Listening...
			</div>
		{/if}
	</div>
{:else}
	<div class="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
		<div class="flex items-start gap-3">
			<svg class="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
			</svg>
			<div>
				<div class="font-medium">Voice recording not supported</div>
				<div class="mt-1">
					Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari for voice journaling.
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes ping {
		75%, 100% {
			transform: scale(2);
			opacity: 0;
		}
	}
</style>