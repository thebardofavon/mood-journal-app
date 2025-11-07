<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let {
		exercise = 'box'
	}: {
		exercise: 'box' | '478';
	} = $props();

	// Breathing states
	let phase = $state<'inhale' | 'hold1' | 'exhale' | 'hold2'>('inhale');
	let isActive = $state(false);
	let countdown = $state(0);
	let cycleCount = $state(0);
	let intervalId: number | null = null;

	// Exercise configurations
	const exercises = {
		box: {
			name: 'Box Breathing',
			description: 'Equal parts breathing for calm and focus',
			phases: {
				inhale: { duration: 4, label: 'Breathe In' },
				hold1: { duration: 4, label: 'Hold' },
				exhale: { duration: 4, label: 'Breathe Out' },
				hold2: { duration: 4, label: 'Hold' }
			}
		},
		'478': {
			name: '4-7-8 Breathing',
			description: 'Calming technique for stress and anxiety',
			phases: {
				inhale: { duration: 4, label: 'Breathe In' },
				hold1: { duration: 7, label: 'Hold' },
				exhale: { duration: 8, label: 'Breathe Out' },
				hold2: { duration: 0, label: '' } // No second hold in 4-7-8
			}
		}
	};

	const currentExercise = $derived(exercises[exercise]);
	const currentPhase = $derived(currentExercise.phases[phase]);

	// Calculate circle scale for animation
	const scale = $derived.by(() => {
		if (phase === 'inhale') {
			const progress = 1 - countdown / currentPhase.duration;
			return 0.5 + progress * 0.5; // Scale from 0.5 to 1.0
		} else if (phase === 'exhale') {
			const progress = countdown / currentPhase.duration;
			return 0.5 + progress * 0.5; // Scale from 1.0 to 0.5
		} else {
			return phase === 'hold1' ? 1.0 : 0.5;
		}
	});

	function startExercise() {
		isActive = true;
		phase = 'inhale';
		countdown = currentExercise.phases.inhale.duration;
		cycleCount = 0;
		tick();
	}

	function stopExercise() {
		isActive = false;
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}

	function tick() {
		if (intervalId) clearInterval(intervalId);

		intervalId = window.setInterval(() => {
			countdown--;

			if (countdown <= 0) {
				// Move to next phase
				if (phase === 'inhale') {
					phase = 'hold1';
				} else if (phase === 'hold1') {
					phase = 'exhale';
				} else if (phase === 'exhale') {
					if (currentExercise.phases.hold2.duration > 0) {
						phase = 'hold2';
					} else {
						// Complete cycle
						phase = 'inhale';
						cycleCount++;
					}
				} else if (phase === 'hold2') {
					phase = 'inhale';
					cycleCount++;
				}

				countdown = currentExercise.phases[phase].duration;

				// Stop if duration is 0 (shouldn't happen with validation)
				if (countdown === 0 && phase !== 'hold2') {
					stopExercise();
				}
			}
		}, 1000);
	}

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});

	// Haptic feedback on phase change (mobile only)
	$effect(() => {
		if (isActive && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
			if (phase === 'inhale' || phase === 'exhale') {
				navigator.vibrate(50);
			}
		}
	});
</script>

<div class="breathing-exercise flex flex-col items-center space-y-8 rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
	<!-- Exercise Info -->
	<div class="text-center">
		<h3 class="text-2xl font-bold text-gray-900 dark:text-white">
			{currentExercise.name}
		</h3>
		<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
			{currentExercise.description}
		</p>
	</div>

	<!-- Breathing Circle -->
	<div class="relative h-64 w-64">
		<div
			class="absolute inset-0 flex items-center justify-center transition-transform duration-1000 ease-in-out"
			style="transform: scale({scale})"
		>
			<div
				class="flex h-48 w-48 items-center justify-center rounded-full {phase === 'inhale'
					? 'bg-gradient-to-br from-blue-400 to-blue-600'
					: phase === 'exhale'
						? 'bg-gradient-to-br from-purple-400 to-purple-600'
						: 'bg-gradient-to-br from-green-400 to-green-600'} shadow-2xl"
			>
				<div class="text-center">
					{#if isActive}
						<div class="text-5xl font-bold text-white">{countdown}</div>
						<div class="mt-2 text-lg font-medium text-white/90">{currentPhase.label}</div>
					{:else}
						<div class="text-lg font-medium text-white">Ready</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Pulse rings -->
		{#if isActive}
			<div
				class="absolute inset-0 animate-ping rounded-full border-4 opacity-20 {phase === 'inhale'
					? 'border-blue-500'
					: phase === 'exhale'
						? 'border-purple-500'
						: 'border-green-500'}"
				style="animation-duration: 2s;"
			></div>
		{/if}
	</div>

	<!-- Cycle Counter -->
	{#if isActive}
		<div class="text-center">
			<div class="text-sm text-gray-500 dark:text-gray-400">Completed Cycles</div>
			<div class="text-3xl font-bold text-gray-900 dark:text-white">{cycleCount}</div>
		</div>
	{/if}

	<!-- Controls -->
	<div class="flex gap-4">
		{#if !isActive}
			<button
				onclick={startExercise}
				class="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
			>
				<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
						clip-rule="evenodd"
					/>
				</svg>
				Start
			</button>
		{:else}
			<button
				onclick={stopExercise}
				class="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-700"
			>
				<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
						clip-rule="evenodd"
					/>
				</svg>
				Stop
			</button>
		{/if}
	</div>

	<!-- Instructions -->
	{#if !isActive}
		<div class="w-full rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-900">
			<h4 class="mb-2 font-semibold text-gray-900 dark:text-white">How it works:</h4>
			<ol class="space-y-1 text-gray-600 dark:text-gray-400">
				{#if exercise === 'box'}
					<li>1. Breathe in for 4 seconds</li>
					<li>2. Hold for 4 seconds</li>
					<li>3. Breathe out for 4 seconds</li>
					<li>4. Hold for 4 seconds</li>
					<li>5. Repeat as needed</li>
				{:else}
					<li>1. Breathe in for 4 seconds</li>
					<li>2. Hold for 7 seconds</li>
					<li>3. Breathe out for 8 seconds</li>
					<li>4. Repeat as needed</li>
				{/if}
			</ol>
		</div>
	{/if}
</div>

<style>
	@keyframes ping {
		75%,
		100% {
			transform: scale(2);
			opacity: 0;
		}
	}
</style>
