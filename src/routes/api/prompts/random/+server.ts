import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRandomPrompt } from '$lib/server/wellness';

export const GET: RequestHandler = async ({ url }) => {
	const category = url.searchParams.get('category') || undefined;
	const prompt = getRandomPrompt(category);
	
	return json({ prompt });
};
