# Implementation Guide: Next-Level Features

This guide provides step-by-step instructions for implementing the features outlined in the ENHANCEMENT_ROADMAP.md.

---

## ✅ Already Completed (This Session)

### 1. Landing Page Redesign

- **File**: `src/routes/+page.svelte`
- **Changes**: Complete redesign with hero section, features showcase, testimonials, stats, and CTA
- **Status**: ✅ Complete

### 2. PWA Foundation

- **Files Created**:
  - `static/manifest.json` - PWA manifest with app metadata
  - `static/sw.js` - Service worker with offline support and caching
  - `static/offline.html` - Offline fallback page
- **Files Modified**:
  - `src/app.html` - Added PWA meta tags and service worker registration
- **Status**: ✅ Complete (needs testing and icon generation)

### 3. Achievements System

- **File**: `src/lib/server/achievements.ts`
- **Features**:
  - 20+ achievement definitions across 5 categories
  - XP and leveling system
  - Progress tracking
- **Status**: ✅ Complete (needs database integration)

### 4. Wellness Recommendations Engine

- **File**: `src/lib/server/wellness.ts`
- **Features**:
  - Pattern-based recommendation generation
  - Breathing exercises catalog
  - Journaling prompts library (1000+ prompts possible)
  - Context-aware suggestions
- **Status**: ✅ Complete (needs UI integration)

---

## 🔄 Next Steps: Priority Implementation

### Phase 1: PWA Complete Setup (1-2 days)

#### 1.1 Generate App Icons

```bash
# Use a tool like https://realfavicongenerator.net/ or
# Install sharp for icon generation
npm install --save-dev sharp

# Create icon generation script
```

**Create** `scripts/generate-icons.js`:

```javascript
const sharp = require('sharp');
const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = 'src/lib/assets/favicon.svg';

if (!fs.existsSync('static/icons')) {
	fs.mkdirSync('static/icons', { recursive: true });
}

sizes.forEach((size) => {
	sharp(inputSvg)
		.resize(size, size)
		.png()
		.toFile(`static/icons/icon-${size}x${size}.png`)
		.then(() => console.log(`Generated ${size}x${size} icon`));
});
```

Run: `node scripts/generate-icons.js`

#### 1.2 Test PWA Installation

1. Build the app: `npm run build`
2. Preview: `npm run preview`
3. Open Chrome DevTools > Application > Manifest
4. Test "Add to Home Screen"
5. Test offline functionality

#### 1.3 Add Install Prompt Component

**Create** `src/lib/components/InstallPrompt.svelte`:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';

	let deferredPrompt: any = null;
	let showPrompt = $state(false);

	onMount(() => {
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			deferredPrompt = e;
			// Show prompt after 30 seconds or 3 visits
			const visits = parseInt(localStorage.getItem('visits') || '0') + 1;
			localStorage.setItem('visits', visits.toString());
			if (visits >= 3) {
				setTimeout(() => (showPrompt = true), 30000);
			}
		});
	});

	async function install() {
		if (!deferredPrompt) return;
		deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;
		if (outcome === 'accepted') {
			showPrompt = false;
		}
		deferredPrompt = null;
	}
</script>

{#if showPrompt}
	<div class="fixed right-4 bottom-4 max-w-sm rounded-lg bg-white p-4 shadow-xl dark:bg-gray-800">
		<button onclick={() => (showPrompt = false)} class="absolute top-2 right-2">✕</button>
		<h3 class="mb-2 font-bold">Install Mood Journal</h3>
		<p class="mb-4 text-sm">Get quick access and offline support!</p>
		<Button onclick={install}>Install App</Button>
	</div>
{/if}
```

Add to `src/routes/+layout.svelte`

---

### Phase 2: Achievements Integration (2-3 days)

#### 2.1 Database Schema Updates

**Update** `src/lib/server/db/schema.ts`:

```typescript
export const userAchievements = sqliteTable('user_achievements', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	achievementId: text('achievement_id').notNull(),
	unlockedAt: integer('unlocked_at', { mode: 'timestamp' }).notNull(),
	notified: integer('notified', { mode: 'boolean' }).default(false).notNull()
});

export const userProgress = sqliteTable('user_progress', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	totalXP: integer('total_xp').default(0).notNull(),
	level: integer('level').default(1).notNull(),
	hasViewedAnalytics: integer('has_viewed_analytics', { mode: 'boolean' }).default(false),
	hasUsedAI: integer('has_used_ai', { mode: 'boolean' }).default(false),
	hasSearched: integer('has_searched', { mode: 'boolean' }).default(false),
	hasExported: integer('has_exported', { mode: 'boolean' }).default(false),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});
```

Run migration: `npm run db:generate && npm run db:push`

#### 2.2 Achievement Tracking Server Functions

**Create** `src/lib/server/achievement-tracker.ts`:

```typescript
import { db } from './db';
import { entry, userAchievements, userProgress } from './db/schema';
import { calculateAchievements, calculateLevel, type Achievement } from './achievements';
import { eq, desc, sql } from 'drizzle-orm';

export async function updateUserProgress(userId: string, action: string) {
	// Fetch user stats
	const stats = await getUserStats(userId);

	// Calculate achievements
	const achievements = calculateAchievements(stats);

	// Find newly unlocked
	const existing = await db
		.select()
		.from(userAchievements)
		.where(eq(userAchievements.userId, userId));
	const newlyUnlocked = achievements.filter(
		(a) => a.unlocked && !existing.some((e) => e.achievementId === a.id)
	);

	// Award XP and save achievements
	let totalXP = 0;
	for (const achievement of newlyUnlocked) {
		totalXP += achievement.xp;
		await db.insert(userAchievements).values({
			id: `${userId}-${achievement.id}`,
			userId,
			achievementId: achievement.id,
			unlockedAt: new Date(),
			notified: false
		});
	}

	// Update user progress
	const currentProgress = await db
		.select()
		.from(userProgress)
		.where(eq(userProgress.userId, userId))
		.get();
	const newTotalXP = (currentProgress?.totalXP || 0) + totalXP;
	const { level } = calculateLevel(newTotalXP);

	await db
		.insert(userProgress)
		.values({
			userId,
			totalXP: newTotalXP,
			level,
			updatedAt: new Date()
		})
		.onConflictDoUpdate({
			target: userProgress.userId,
			set: { totalXP: newTotalXP, level, updatedAt: new Date() }
		});

	return { newlyUnlocked, totalXP };
}

async function getUserStats(userId: string) {
	// Implement stats gathering from database
	// Return stats object matching Achievement requirements
}
```

#### 2.3 Achievements Page

**Create** `src/routes/account/achievements/+page.svelte`:

```svelte
<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Progress from '$lib/components/ui/progress';

	let { data } = $props();

	const categoryColors = {
		milestone: 'bg-blue-500',
		consistency: 'bg-orange-500',
		quality: 'bg-purple-500',
		exploration: 'bg-green-500',
		wellness: 'bg-pink-500'
	};
</script>

<div class="mx-auto max-w-6xl p-6">
	<h1 class="mb-2 text-3xl font-bold">Achievements</h1>
	<p class="text-muted-foreground mb-8">
		Level {data.progress.level} • {data.progress.currentXP} / {data.progress.xpToNextLevel} XP to next
		level
	</p>

	<!-- Progress Bar -->
	<Progress.Root value={data.progress.currentXP} max={data.progress.xpToNextLevel} class="mb-8">
		<Progress.Indicator />
	</Progress.Root>

	<!-- Categories -->
	{#each Object.entries(data.achievementsByCategory) as [category, achievements]}
		<div class="mb-8">
			<h2 class="mb-4 text-2xl font-bold capitalize">{category}</h2>
			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each achievements as achievement}
					<Card.Card class={achievement.unlocked ? '' : 'opacity-50'}>
						<Card.CardHeader>
							<div class="flex items-start justify-between">
								<span class="text-4xl">{achievement.icon}</span>
								{#if achievement.unlocked}
									<Badge variant="secondary">Unlocked</Badge>
								{:else}
									<Badge variant="outline">{achievement.progress}/{achievement.requirement}</Badge>
								{/if}
							</div>
							<Card.CardTitle>{achievement.title}</Card.CardTitle>
						</Card.CardHeader>
						<Card.CardContent>
							<Card.CardDescription>{achievement.description}</Card.CardDescription>
							{#if !achievement.unlocked}
								<Progress.Root
									value={achievement.progress}
									max={achievement.requirement}
									class="mt-4"
								>
									<Progress.Indicator />
								</Progress.Root>
							{/if}
							<p class="text-muted-foreground mt-2 text-sm">+{achievement.xp} XP</p>
						</Card.CardContent>
					</Card.Card>
				{/each}
			</div>
		</div>
	{/each}
</div>
```

---

### Phase 3: Wellness Recommendations UI (1-2 days)

#### 3.1 Recommendations Dashboard

**Create** `src/routes/journal/wellness/+page.svelte`:

```svelte
<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';

	let { data } = $props();

	const typeIcons = {
		breathing: '🫁',
		meditation: '🧘',
		activity: '🏃',
		prompt: '✍️',
		resource: '📚',
		insight: '💡'
	};
</script>

<div class="mx-auto max-w-4xl p-6">
	<h1 class="mb-2 text-3xl font-bold">Wellness Recommendations</h1>
	<p class="text-muted-foreground mb-8">Personalized suggestions based on your recent entries</p>

	{#each data.recommendations as rec}
		<Card.Card class="mb-4">
			<Card.CardHeader>
				<div class="flex items-start gap-4">
					<span class="text-4xl">{rec.icon}</span>
					<div class="flex-1">
						<Card.CardTitle>{rec.title}</Card.CardTitle>
						{#if rec.duration}
							<Badge variant="secondary">{rec.duration}</Badge>
						{/if}
					</div>
				</div>
			</Card.CardHeader>
			<Card.CardContent>
				<Card.CardDescription class="mb-4 text-base">{rec.description}</Card.CardDescription>
				<Button variant="default">Try This</Button>
			</Card.CardContent>
		</Card.Card>
	{/each}
</div>
```

---

### Phase 4: Voice Journaling (3-4 days)

#### 4.1 Voice Recording Component

**Create** `src/lib/components/VoiceRecorder.svelte`:

```svelte
<script lang="ts">
	import { Button } from '$lib/components/ui/button';

	let isRecording = $state(false);
	let transcript = $state('');
	let recognition: any = null;

	function startRecording() {
		if (!('webkitSpeechRecognition' in window)) {
			alert('Speech recognition not supported');
			return;
		}

		recognition = new (window as any).webkitSpeechRecognition();
		recognition.continuous = true;
		recognition.interimResults = true;

		recognition.onresult = (event: any) => {
			let interim = '';
			for (let i = event.resultIndex; i < event.results.length; i++) {
				if (event.results[i].isFinal) {
					transcript += event.results[i][0].transcript + ' ';
				} else {
					interim += event.results[i][0].transcript;
				}
			}
		};

		recognition.start();
		isRecording = true;
	}

	function stopRecording() {
		recognition?.stop();
		isRecording = false;
	}
</script>

<div class="voice-recorder">
	{#if !isRecording}
		<Button onclick={startRecording} size="lg">🎙️ Start Voice Entry</Button>
	{:else}
		<Button onclick={stopRecording} variant="destructive" size="lg">⏹️ Stop Recording</Button>
	{/if}

	{#if transcript}
		<div class="mt-4 rounded border p-4">
			<p class="text-muted-foreground mb-2 text-sm">Transcript:</p>
			<p>{transcript}</p>
		</div>
	{/if}
</div>
```

Add to `src/routes/journal/new/+page.svelte`

---

### Phase 5: Mobile Optimizations (2-3 days)

#### 5.1 Bottom Navigation (Mobile)

**Create** `src/lib/components/BottomNav.svelte`:

```svelte
<script lang="ts">
	import { page } from '$app/stores';

	const navItems = [
		{ href: '/journal', icon: '📔', label: 'Journal' },
		{ href: '/journal/new', icon: '➕', label: 'New' },
		{ href: '/journal/analytics', icon: '📊', label: 'Analytics' },
		{ href: '/account', icon: '👤', label: 'Account' }
	];
</script>

<nav
	class="fixed right-0 bottom-0 left-0 z-50 border-t border-gray-200 bg-white md:hidden dark:border-gray-800 dark:bg-gray-900"
>
	<div class="flex h-16 items-center justify-around">
		{#each navItems as item}
			<a
				href={item.href}
				class="flex h-full flex-1 flex-col items-center justify-center {$page.url.pathname ===
				item.href
					? 'text-blue-600 dark:text-blue-400'
					: 'text-gray-600 dark:text-gray-400'}"
			>
				<span class="text-2xl">{item.icon}</span>
				<span class="mt-1 text-xs">{item.label}</span>
			</a>
		{/each}
	</div>
</nav>
```

Add to main layout with mobile detection.

---

## 📋 Testing Checklist

### PWA Testing

- [ ] Manifest loads correctly
- [ ] Icons appear in all sizes
- [ ] Install prompt appears
- [ ] App installs successfully on mobile
- [ ] Offline mode works
- [ ] Service worker caches assets
- [ ] Background sync works

### Achievements Testing

- [ ] First entry unlocks achievement
- [ ] Streak achievements work
- [ ] XP is awarded correctly
- [ ] Level calculations are accurate
- [ ] Notifications appear for new achievements
- [ ] Progress bars display correctly

### Wellness Recommendations Testing

- [ ] Recommendations appear based on mood
- [ ] Breathing exercises are accessible
- [ ] Prompts are relevant
- [ ] Pattern insights are accurate

### Voice Journaling Testing

- [ ] Speech recognition starts/stops
- [ ] Transcript is accurate
- [ ] Works on mobile devices
- [ ] Handles errors gracefully

---

## 🚀 Deployment Considerations

1. **Environment Variables**: Ensure all API keys are set
2. **Database Migrations**: Run migrations before deploying
3. **HTTPS Required**: PWA requires HTTPS (use Vercel/Netlify)
4. **Cache Strategy**: Test cache invalidation
5. **Mobile Testing**: Test on real devices (iOS Safari, Android Chrome)

---

## 📚 Additional Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Achievement Design Patterns](https://www.gamedeveloper.com/design/achievement-design-101)

---

## 🎯 Success Metrics

Track these to measure feature success:

- PWA install rate: Target 30%+
- Daily active users: Monitor engagement
- Achievement unlock rate: 80%+ should unlock first achievement
- Wellness feature usage: Target 40%+ engagement
- Voice journaling adoption: Target 20%+

Good luck with implementation! 🚀
