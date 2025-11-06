import type { PageServerLoad } from './$types';
import { validateSessionToken } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('auth-session');
	const { user } = await validateSessionToken(token || '');

	// Return user data if logged in, null otherwise
	// Let the landing page show for everyone
	return {
		user: user || null
	};
};
