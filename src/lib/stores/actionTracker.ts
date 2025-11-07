import { achievementNotifications } from './achievements';

/**
 * Track user actions for achievements
 */
export async function trackAction(action: 'view_analytics' | 'search' | 'export' | 'use_ai') {
	if (typeof window === 'undefined') return;

	try {
		const response = await fetch('/api/achievements/track', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action })
		});

		if (response.ok) {
			const data = await response.json();
			
			// Show any newly unlocked achievements
			if (data.newlyUnlocked && data.newlyUnlocked.length > 0) {
				for (const achievement of data.newlyUnlocked) {
					achievementNotifications.addNotification({
						id: achievement.id,
						title: achievement.title,
						description: achievement.description,
						icon: achievement.icon,
						xp: achievement.xp
					});
				}
			}
		}
	} catch (error) {
		console.error('Failed to track action:', error);
	}
}
