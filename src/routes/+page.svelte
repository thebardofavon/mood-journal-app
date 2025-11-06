<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';

	let { data } = $props();

	const features = [
		{
			icon: '🧠',
			title: 'AI-Powered Insights',
			description:
				'Get deep insights into your emotional patterns with advanced sentiment analysis and personalized recommendations.'
		},
		{
			icon: '📊',
			title: 'Visual Analytics',
			description:
				'Track your mood trends, streaks, and progress with beautiful, interactive charts and visualizations.'
		},
		{
			icon: '💬',
			title: 'AI Companion',
			description:
				'Chat with your personal AI wellness companion that understands your journey and offers thoughtful guidance.'
		},
		{
			icon: '🔒',
			title: 'Privacy First',
			description:
				'Your thoughts are yours alone. Enterprise-grade security with end-to-end encryption options.'
		},
		{
			icon: '🎯',
			title: 'Smart Search',
			description:
				'Find any entry instantly with semantic search, keyword filtering, and mood-based discovery.'
		},
		{
			icon: '📱',
			title: 'Works Everywhere',
			description:
				'Seamless experience across desktop, mobile, and tablet with offline support coming soon.'
		}
	];

	const testimonials = [
		{
			quote: 'This app helped me understand my anxiety patterns and break negative cycles.',
			author: 'Sarah M.',
			mood: '😊'
		},
		{
			quote: 'The AI companion feels like talking to a caring friend who really gets me.',
			author: 'Alex K.',
			mood: '🤗'
		},
		{
			quote: 'Seeing my progress visually motivated me to keep journaling every day.',
			author: 'Jordan L.',
			mood: '🎯'
		}
	];

	const stats = [
		{ value: '10,000+', label: 'Journal Entries' },
		{ value: '95%', label: 'User Satisfaction' },
		{ value: '50+', label: 'Days Average Streak' },
		{ value: '24/7', label: 'AI Support' }
	];

	const faqs = [
		{
			question: 'Is my data private and secure?',
			answer:
				'Absolutely. Your journal entries are encrypted and stored securely. We never share your data with third parties, and you have full control over your information.'
		},
		{
			question: 'How does the AI analysis work?',
			answer:
				'Our AI uses advanced natural language processing to analyze sentiment, identify emotional patterns, and extract key themes from your entries. All processing can be done locally for maximum privacy.'
		},
		{
			question: 'Is Mood Journal really free?',
			answer:
				'Yes! The core features are completely free forever. We believe everyone deserves access to mental wellness tools.'
		},
		{
			question: 'Can I export my journal entries?',
			answer:
				'Yes, you can export all your entries in multiple formats (PDF, Markdown, JSON) at any time. Your data belongs to you.'
		},
		{
			question: 'Does it work offline?',
			answer:
				"Yes! You can write and read entries offline. The app will sync your data when you're back online."
		},
		{
			question: 'What AI models do you use?',
			answer:
				'We support multiple AI providers including local Ollama models for privacy-focused users, as well as cloud options like OpenAI and Google Gemini for enhanced features.'
		}
	];

	const technologies = [
		{ name: 'SvelteKit', icon: '⚡' },
		{ name: 'AI Powered', icon: '🤖' },
		{ name: 'Open Source', icon: '📖' },
		{ name: 'Privacy First', icon: '🔒' }
	];

	let openFaqIndex = $state<number | null>(null);

	function toggleFaq(index: number) {
		openFaqIndex = openFaqIndex === index ? null : index;
	}
</script>

<svelte:head>
	<title>Mood Journal - Your Intelligent Wellness Companion</title>
	<meta
		name="description"
		content="Transform your mental wellness journey with AI-powered insights, sentiment analysis, and personalized guidance. Start journaling smarter today."
	/>
</svelte:head>

<div class="from-background to-secondary/20 min-h-screen bg-gradient-to-b">
	<!-- Hero Section -->
	<section class="relative overflow-hidden">
		<!-- Decorative background -->
		<div
			class="bg-grid-slate-900/[0.04] dark:bg-grid-slate-100/[0.03] absolute inset-0 bg-[size:75px_75px]"
			aria-hidden="true"
		></div>
		<div
			class="from-background absolute inset-0 bg-gradient-to-t via-transparent to-transparent"
			aria-hidden="true"
		></div>

		<div class="relative mx-auto max-w-6xl px-4 py-20 sm:py-32">
			<div class="space-y-8 text-center">
				<!-- Badge -->
				<div class="flex justify-center">
					<Badge variant="secondary" class="px-4 py-1.5 text-sm">
						✨ AI-Powered Journaling Platform
					</Badge>
				</div>

				<!-- Headline -->
				<h1 class="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
					<span
						class="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:text-white"
					>
						Your Thoughts,
					</span>
					<br />
					<span
						class="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400"
					>
						Understood & Analyzed
					</span>
				</h1>

				<!-- Subheadline -->
				<p class="text-muted-foreground mx-auto max-w-2xl text-lg sm:text-xl">
					Transform your mental wellness journey with AI-powered insights, sentiment analysis, and
					personalized guidance. Your private space for reflection and growth.
				</p>

				<!-- CTA Buttons -->
				<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
					{#if data.user}
						<Button href="/journal" size="lg" class="px-8 py-6 text-lg">Go to Journal →</Button>
						<Button href="/journal/analytics" variant="outline" size="lg" class="px-8 py-6 text-lg">
							View Analytics
						</Button>
					{:else}
						<Button href="/auth/register" size="lg" class="px-8 py-6 text-lg">
							Start Journaling Free
						</Button>
						<Button href="/auth/login" variant="outline" size="lg" class="px-8 py-6 text-lg">
							Sign In
						</Button>
					{/if}
				</div>

				<!-- Social Proof -->
				<div
					class="text-muted-foreground flex flex-wrap items-center justify-center gap-8 pt-8 text-sm"
				>
					<div class="flex items-center gap-2">
						<div class="flex -space-x-2">
							{#each [1, 2, 3, 4] as i}
								<div
									class="border-background h-8 w-8 rounded-full border-2 bg-gradient-to-br from-blue-400 to-purple-400"
								></div>
							{/each}
						</div>
						<span>Trusted by thousands</span>
					</div>
					<div class="flex items-center gap-1">
						<span class="text-yellow-500">★★★★★</span>
						<span>4.9/5 rating</span>
					</div>
				</div>

				<!-- Hero Visual/Demo -->
				<div class="relative mt-16">
					<div class="relative mx-auto max-w-5xl">
						<!-- Browser mockup -->
						<div class="border-border bg-background overflow-hidden rounded-lg border shadow-2xl">
							<!-- Browser chrome -->
							<div class="bg-secondary/50 border-border flex items-center gap-2 border-b px-4 py-3">
								<div class="flex gap-2">
									<div class="h-3 w-3 rounded-full bg-red-500"></div>
									<div class="h-3 w-3 rounded-full bg-yellow-500"></div>
									<div class="h-3 w-3 rounded-full bg-green-500"></div>
								</div>
								<div class="flex flex-1 justify-center">
									<div class="bg-secondary/80 text-muted-foreground rounded px-4 py-1 text-xs">
										localhost:5173/journal
									</div>
								</div>
							</div>

							<!-- App preview content -->
							<div class="from-background via-secondary/20 to-background bg-gradient-to-br p-8">
								<div class="space-y-4">
									<!-- Mock journal entry -->
									<div class="bg-card border-border rounded-lg border p-6 shadow-lg">
										<div class="mb-4 flex items-start justify-between">
											<div>
												<div class="text-muted-foreground mb-1 text-sm">Today at 2:30 PM</div>
												<div class="text-xl font-semibold">Feeling grateful today 🌟</div>
											</div>
											<Badge variant="default" class="bg-green-500">Positive</Badge>
										</div>
										<p class="text-muted-foreground mb-4">
											Had a wonderful morning walk and felt really connected to nature...
										</p>
										<div class="flex flex-wrap gap-2">
											<Badge variant="secondary">gratitude</Badge>
											<Badge variant="secondary">nature</Badge>
											<Badge variant="secondary">mindfulness</Badge>
										</div>
									</div>

									<!-- Mock analytics preview -->
									<div class="grid grid-cols-3 gap-4">
										<div class="bg-card border-border rounded-lg border p-4 shadow">
											<div class="mb-1 text-2xl">😊</div>
											<div class="text-muted-foreground text-sm">Mood</div>
										</div>
										<div class="bg-card border-border rounded-lg border p-4 shadow">
											<div class="mb-1 text-2xl font-bold">🔥 12</div>
											<div class="text-muted-foreground text-sm">Day Streak</div>
										</div>
										<div class="bg-card border-border rounded-lg border p-4 shadow">
											<div class="mb-1 text-2xl font-bold">📈</div>
											<div class="text-muted-foreground text-sm">Growing</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						<!-- Decorative elements -->
						<div
							class="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-blue-500/20 blur-3xl"
						></div>
						<div
							class="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-purple-500/20 blur-3xl"
						></div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Stats Section -->
	<section
		class="bg-gradient-to-r from-blue-600/10 to-purple-600/10 py-16 dark:from-blue-600/5 dark:to-purple-600/5"
	>
		<div class="mx-auto max-w-6xl px-4">
			<div class="grid grid-cols-2 gap-8 lg:grid-cols-4">
				{#each stats as stat}
					<div class="text-center">
						<div
							class="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl dark:from-blue-400 dark:to-purple-400"
						>
							{stat.value}
						</div>
						<div class="text-muted-foreground mt-2 text-sm">{stat.label}</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Features Section -->
	<section class="bg-background py-20">
		<div class="mx-auto max-w-6xl px-4">
			<div class="mb-16 text-center">
				<Badge variant="secondary" class="mb-4">Features</Badge>
				<h2 class="mb-4 text-3xl font-bold sm:text-4xl">
					Everything You Need for Mindful Journaling
				</h2>
				<p class="text-muted-foreground mx-auto max-w-2xl text-lg">
					Powerful features designed to help you understand yourself better and build lasting
					wellness habits.
				</p>
			</div>

			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each features as feature}
					<Card.Card class="group transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
						<Card.CardHeader>
							<div class="mb-4 text-5xl transition-transform group-hover:scale-110">
								{feature.icon}
							</div>
							<Card.CardTitle class="text-xl">{feature.title}</Card.CardTitle>
						</Card.CardHeader>
						<Card.CardContent>
							<Card.CardDescription class="text-base">
								{feature.description}
							</Card.CardDescription>
						</Card.CardContent>
					</Card.Card>
				{/each}
			</div>
		</div>
	</section>

	<!-- How It Works Section -->
	<section class="bg-secondary/30 py-20">
		<div class="mx-auto max-w-6xl px-4">
			<div class="mb-16 text-center">
				<Badge variant="secondary" class="mb-4">Simple Process</Badge>
				<h2 class="mb-4 text-3xl font-bold sm:text-4xl">Start Journaling in 3 Easy Steps</h2>
			</div>

			<div class="grid gap-8 md:grid-cols-3">
				<div class="relative">
					<div class="flex flex-col items-center text-center">
						<div
							class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-blue-500 text-2xl font-bold text-white"
						>
							1
						</div>
						<h3 class="mb-2 text-xl font-semibold">Write Your Thoughts</h3>
						<p class="text-muted-foreground">
							Express yourself freely. Use markdown, add photos, or record voice notes.
						</p>
					</div>
					{#if true}
						<div
							class="absolute top-8 left-[60%] hidden h-0.5 w-[80%] bg-gradient-to-r from-blue-600 to-purple-600 md:block"
							aria-hidden="true"
						></div>
					{/if}
				</div>

				<div class="relative">
					<div class="flex flex-col items-center text-center">
						<div
							class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-purple-500 text-2xl font-bold text-white"
						>
							2
						</div>
						<h3 class="mb-2 text-xl font-semibold">Get AI Insights</h3>
						<p class="text-muted-foreground">
							Our AI analyzes your entry for sentiment, keywords, and emotional patterns.
						</p>
					</div>
					{#if true}
						<div
							class="absolute top-8 left-[60%] hidden h-0.5 w-[80%] bg-gradient-to-r from-purple-600 to-pink-600 md:block"
							aria-hidden="true"
						></div>
					{/if}
				</div>

				<div>
					<div class="flex flex-col items-center text-center">
						<div
							class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-pink-600 to-pink-500 text-2xl font-bold text-white"
						>
							3
						</div>
						<h3 class="mb-2 text-xl font-semibold">Track Your Growth</h3>
						<p class="text-muted-foreground">
							Visualize your progress, discover patterns, and celebrate your wellness journey.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Testimonials Section -->
	<section class="bg-background py-20">
		<div class="mx-auto max-w-6xl px-4">
			<div class="mb-16 text-center">
				<Badge variant="secondary" class="mb-4">Testimonials</Badge>
				<h2 class="mb-4 text-3xl font-bold sm:text-4xl">Loved by Mindful Journalers</h2>
			</div>

			<div class="grid gap-6 md:grid-cols-3">
				{#each testimonials as testimonial}
					<Card.Card class="from-background to-secondary/20 bg-gradient-to-br">
						<Card.CardHeader>
							<div class="flex items-center gap-3">
								<div class="text-4xl">{testimonial.mood}</div>
								<div class="flex text-yellow-500">★★★★★</div>
							</div>
						</Card.CardHeader>
						<Card.CardContent>
							<p class="text-muted-foreground mb-4 italic">"{testimonial.quote}"</p>
							<p class="font-semibold">— {testimonial.author}</p>
						</Card.CardContent>
					</Card.Card>
				{/each}
			</div>
		</div>
	</section>

	<!-- Pricing Section -->
	<section class="bg-secondary/30 py-20">
		<div class="mx-auto max-w-6xl px-4">
			<div class="mb-16 text-center">
				<Badge variant="secondary" class="mb-4">Pricing</Badge>
				<h2 class="mb-4 text-3xl font-bold sm:text-4xl">Simple, Transparent Pricing</h2>
				<p class="text-muted-foreground text-lg">
					Start for free, stay for free. Mental wellness should be accessible to everyone.
				</p>
			</div>

			<div class="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
				<!-- Free Plan -->
				<Card.Card class="relative">
					<Card.CardHeader>
						<Badge variant="secondary" class="mb-2 w-fit">Free Forever</Badge>
						<Card.CardTitle class="text-2xl">Free</Card.CardTitle>
						<div class="mt-4">
							<span class="text-5xl font-bold">$0</span>
							<span class="text-muted-foreground">/month</span>
						</div>
					</Card.CardHeader>
					<Card.CardContent>
						<ul class="mb-6 space-y-3">
							<li class="flex items-start gap-2">
								<span class="text-xl text-green-500">✓</span>
								<span>Unlimited journal entries</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-xl text-green-500">✓</span>
								<span>AI sentiment analysis</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-xl text-green-500">✓</span>
								<span>Mood tracking & analytics</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-xl text-green-500">✓</span>
								<span>Search & filter entries</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-xl text-green-500">✓</span>
								<span>Export your data anytime</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-xl text-green-500">✓</span>
								<span>Mobile-friendly interface</span>
							</li>
						</ul>
						<Button href="/auth/register" class="w-full" size="lg">Get Started Free</Button>
					</Card.CardContent>
				</Card.Card>

				<!-- Premium/Pro Features (coming soon) -->
				<Card.Card class="relative border-2 border-blue-500/50">
					<div class="absolute -top-3 left-1/2 -translate-x-1/2">
						<Badge class="bg-gradient-to-r from-blue-600 to-purple-600">Coming Soon</Badge>
					</div>
					<Card.CardHeader>
						<Card.CardTitle class="text-2xl">Pro</Card.CardTitle>
						<div class="mt-4">
							<span class="text-5xl font-bold">$5</span>
							<span class="text-muted-foreground">/month</span>
						</div>
					</Card.CardHeader>
					<Card.CardContent>
						<p class="text-muted-foreground mb-4 text-sm">Everything in Free, plus:</p>
						<ul class="mb-6 space-y-3">
							<li class="flex items-start gap-2">
								<span class="text-xl text-blue-500">✓</span>
								<span>Advanced AI models (GPT-4, Claude)</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-xl text-blue-500">✓</span>
								<span>Voice journaling</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-xl text-blue-500">✓</span>
								<span>Photo & media uploads</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-xl text-blue-500">✓</span>
								<span>Detailed analytics reports</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-xl text-blue-500">✓</span>
								<span>Priority support</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-xl text-blue-500">✓</span>
								<span>Custom themes & personalization</span>
							</li>
						</ul>
						<Button variant="outline" class="w-full" size="lg" disabled>Coming Soon</Button>
					</Card.CardContent>
				</Card.Card>
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="bg-gradient-to-r from-blue-600 to-purple-600 py-20 text-white">
		<div class="mx-auto max-w-4xl px-4 text-center">
			<h2 class="mb-6 text-3xl font-bold sm:text-5xl">Ready to Transform Your Wellness Journey?</h2>
			<p class="mb-8 text-xl text-blue-100">
				Join thousands of users who are discovering deeper insights about themselves every day.
			</p>
			<div class="flex flex-col justify-center gap-4 sm:flex-row">
				{#if data.user}
					<Button href="/journal" size="lg" variant="secondary" class="px-8 py-6 text-lg">
						Open Your Journal →
					</Button>
				{:else}
					<Button href="/auth/register" size="lg" variant="secondary" class="px-8 py-6 text-lg">
						Start Free Today
					</Button>
					<Button
						href="#features"
						size="lg"
						variant="outline"
						class="border-white px-8 py-6 text-lg text-white hover:bg-white/10"
					>
						Learn More
					</Button>
				{/if}
			</div>
			<p class="mt-6 text-sm text-blue-100">
				No credit card required • Free forever • Cancel anytime
			</p>
		</div>
	</section>

	<!-- FAQ Section -->
	<section class="bg-background py-20">
		<div class="mx-auto max-w-4xl px-4">
			<div class="mb-16 text-center">
				<Badge variant="secondary" class="mb-4">FAQ</Badge>
				<h2 class="mb-4 text-3xl font-bold sm:text-4xl">Frequently Asked Questions</h2>
				<p class="text-muted-foreground text-lg">Everything you need to know about Mood Journal</p>
			</div>

			<div class="space-y-4">
				{#each faqs as faq, index}
					<Card.Card class="overflow-hidden">
						<button type="button" class="w-full text-left" onclick={() => toggleFaq(index)}>
							<Card.CardHeader class="hover:bg-secondary/50 cursor-pointer transition-colors">
								<div class="flex items-center justify-between">
									<Card.CardTitle class="text-lg">{faq.question}</Card.CardTitle>
									<div
										class="text-2xl transition-transform duration-300 {openFaqIndex === index
											? 'rotate-180'
											: ''}"
									>
										↓
									</div>
								</div>
							</Card.CardHeader>
						</button>
						{#if openFaqIndex === index}
							<Card.CardContent class="animate-in slide-in-from-top-2 pt-0 duration-300">
								<p class="text-muted-foreground">{faq.answer}</p>
							</Card.CardContent>
						{/if}
					</Card.Card>
				{/each}
			</div>
		</div>
	</section>

	<!-- Technology & Trust Section -->
	<section class="bg-secondary/30 py-16">
		<div class="mx-auto max-w-6xl px-4">
			<div class="mb-8 text-center">
				<h3 class="mb-8 text-xl font-semibold">Built with Modern Technology</h3>
			</div>
			<div class="flex flex-wrap items-center justify-center gap-8">
				{#each technologies as tech}
					<div class="bg-background flex items-center gap-2 rounded-full px-6 py-3 shadow-sm">
						<span class="text-2xl">{tech.icon}</span>
						<span class="font-semibold">{tech.name}</span>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="bg-background border-border border-t py-12">
		<div class="mx-auto max-w-6xl px-4">
			<div class="grid gap-8 md:grid-cols-4">
				<div class="md:col-span-2">
					<h3 class="mb-4 text-lg font-bold">Mood Journal</h3>
					<p class="text-muted-foreground mb-4">
						Your intelligent wellness companion for mindful journaling and emotional growth.
					</p>
					<div class="flex gap-4">
						<button
							type="button"
							class="text-muted-foreground hover:text-foreground transition-colors">Privacy</button
						>
						<button
							type="button"
							class="text-muted-foreground hover:text-foreground transition-colors">Terms</button
						>
						<button
							type="button"
							class="text-muted-foreground hover:text-foreground transition-colors">Contact</button
						>
					</div>
				</div>

				<div>
					<h4 class="mb-4 font-semibold">Product</h4>
					<div class="space-y-2">
						<a
							href="/journal"
							class="text-muted-foreground hover:text-foreground block transition-colors">Journal</a
						>
						<a
							href="/journal/analytics"
							class="text-muted-foreground hover:text-foreground block transition-colors"
							>Analytics</a
						>
						<a
							href="/journal/companion"
							class="text-muted-foreground hover:text-foreground block transition-colors"
							>AI Companion</a
						>
						<a
							href="/journal/insights"
							class="text-muted-foreground hover:text-foreground block transition-colors"
							>Insights</a
						>
					</div>
				</div>

				<div>
					<h4 class="mb-4 font-semibold">Account</h4>
					<div class="space-y-2">
						{#if data.user}
							<a
								href="/account"
								class="text-muted-foreground hover:text-foreground block transition-colors"
								>Settings</a
							>
							<a
								href="/auth/logout"
								class="text-muted-foreground hover:text-foreground block transition-colors"
								>Sign Out</a
							>
						{:else}
							<a
								href="/auth/login"
								class="text-muted-foreground hover:text-foreground block transition-colors"
								>Sign In</a
							>
							<a
								href="/auth/register"
								class="text-muted-foreground hover:text-foreground block transition-colors"
								>Sign Up</a
							>
						{/if}
					</div>
				</div>
			</div>

			<div class="border-border text-muted-foreground mt-12 border-t pt-8 text-center text-sm">
				<p>© {new Date().getFullYear()} Mood Journal. Built with ❤️ for mindful journaling.</p>
			</div>
		</div>
	</footer>
</div>

<style>
	.bg-grid-slate-900\/\[0\.04\] {
		background-image:
			linear-gradient(to right, rgb(15 23 42 / 0.04) 1px, transparent 1px),
			linear-gradient(to bottom, rgb(15 23 42 / 0.04) 1px, transparent 1px);
	}
</style>
