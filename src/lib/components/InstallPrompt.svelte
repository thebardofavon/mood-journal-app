<script lang="ts">
	import { onMount } from 'svelte';

	let deferredPrompt: any = null;
	let showPrompt = false;
	let dismissed = false;

	// Check if app is already installed
	let isInstalled = false;

	onMount(() => {
		// Check if app is already installed
		if (window.matchMedia('(display-mode: standalone)').matches) {
			isInstalled = true;
			return;
		}

		// Listen for the beforeinstallprompt event
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			deferredPrompt = e;

			// Show prompt after user has visited a few times
			const visitCount = parseInt(localStorage.getItem('visitCount') || '0') + 1;
			localStorage.setItem('visitCount', visitCount.toString());

			// Show after 3 visits and not dismissed
			if (visitCount >= 3 && !localStorage.getItem('installDismissed')) {
				setTimeout(() => {
					showPrompt = true;
				}, 2000); // Show after 2 seconds on page
			}
		});

		// Listen for successful installation
		window.addEventListener('appinstalled', () => {
			deferredPrompt = null;
			showPrompt = false;
			isInstalled = true;
		});
	});

	function installApp() {
		if (deferredPrompt) {
			deferredPrompt.prompt();
			deferredPrompt.userChoice.then((choiceResult: any) => {
				if (choiceResult.outcome === 'accepted') {
					console.log('User accepted the install prompt');
				}
				deferredPrompt = null;
				showPrompt = false;
			});
		}
	}

	function dismissPrompt() {
		showPrompt = false;
		localStorage.setItem('installDismissed', 'true');
	}
</script>

{#if showPrompt && !isInstalled}
	<div class="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
			<div class="flex items-start gap-3">
				<div class="flex-shrink-0">
					<div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
						<span class="text-white font-bold text-lg">MJ</span>
					</div>
				</div>
				<div class="flex-1 min-w-0">
					<h3 class="text-sm font-semibold text-gray-900 dark:text-white">
						Install Mood Journal
					</h3>
					<p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
						Get the full experience with offline access, faster loading, and native app features.
					</p>
					<div class="flex gap-2 mt-3">
						<button
							onclick={installApp}
							class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors"
						>
							Install
						</button>
						<button
							onclick={dismissPrompt}
							class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2"
							aria-label="Dismiss"
						>
							×
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}