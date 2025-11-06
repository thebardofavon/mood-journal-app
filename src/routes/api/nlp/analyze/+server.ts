import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { detectCognitiveDistortions, generateReframes } from '$lib/server/nlp';
import { db } from '$lib/server/db';
import { entry } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { validateSessionToken } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const token = cookies.get('auth-session');
		const { user } = await validateSessionToken(token || '');

		if (!user?.id) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { entryId, text } = await request.json();

		if (!text || typeof text !== 'string') {
			return json({ error: 'Text is required' }, { status: 400 });
		}

		// Optional: verify entry belongs to user if entryId provided
		if (entryId) {
			const userEntry = await db.select().from(entry).where(eq(entry.id, entryId)).limit(1);

			if (userEntry.length === 0 || userEntry[0].userId !== user.id) {
				return json({ error: 'Entry not found' }, { status: 404 });
			}
		}

		// Detect distortions and generate reframes
		const distortions = await detectCognitiveDistortions(text);
		const result = generateReframes(distortions, text);

		return json({
			success: true,
			analysis: {
				distortions: result.distortions,
				reframes: result.reframes,
				socratics: result.socratics,
				positiveAnchors: result.positiveAnchors,
				analyzedAt: new Date().toISOString()
			}
		});
	} catch (error) {
		console.error('NLP analysis error:', error);
		return json(
			{
				error: 'Failed to analyze entry',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

// Feedback endpoint for user corrections
export const PUT: RequestHandler = async ({ request, cookies }) => {
	try {
		const token = cookies.get('auth-session');
		const { user } = await validateSessionToken(token || '');

		if (!user?.id) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { entryId, distortionType, accepted, notes } = await request.json();

		// Log feedback for future model improvement
		console.log('NLP Feedback:', {
			userId: user.id,
			entryId,
			distortionType,
			accepted,
			notes,
			timestamp: new Date().toISOString()
		});

		// TODO: Store feedback in database for active learning
		// This could feed into fine-tuning or prompt improvement

		return json({
			success: true,
			message: 'Feedback recorded'
		});
	} catch (error) {
		console.error('Feedback error:', error);
		return json({ error: 'Failed to record feedback' }, { status: 500 });
	}
};
