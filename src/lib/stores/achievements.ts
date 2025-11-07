import { writable } from 'svelte/store';

export interface AchievementNotification {
	id: string;
	title: string;
	description: string;
	icon: string;
	xp: number;
}

function createAchievementStore() {
	const { subscribe, update } = writable<AchievementNotification[]>([]);

	return {
		subscribe,
		addNotification: (achievement: AchievementNotification) => {
			update((notifications) => [...notifications, achievement]);
		},
		removeNotification: (id: string) => {
			update((notifications) => notifications.filter((n) => n.id !== id));
		},
		clear: () => {
			update(() => []);
		}
	};
}

export const achievementNotifications = createAchievementStore();
