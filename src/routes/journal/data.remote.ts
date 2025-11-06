import { query, form } from '$app/server';
import * as v from 'valibot';
import { db } from '$lib/server/db';
import { desc, eq, inArray } from 'drizzle-orm';
import * as table from '$lib/server/db/schema';
import { getRequestEvent } from '$app/server';
import { allow as allowRate } from '$lib/server/rateLimit';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { analyzeSentiment, extractKeywords, extractEntities } from '$lib/server/nlp';
import { getAISettings, generateFollowUpQuestion } from '$lib/server/ai';
import { updateUserAchievements } from '$lib/server/achievement-tracker';

export const listEntries = query(async () => {
	// Fetch latest 20 entries ordered by created_at
	const rows = await db.select().from(table.entry).orderBy(desc(table.entry.createdAt)).limit(20);

	// Fetch tags for all entries
	const entryIds = rows.map((r) => r.id);
	const entryTagsData =
		entryIds.length > 0
			? await db
					.select({
						entryId: table.entryTag.entryId,
						tagId: table.entryTag.tagId,
						tagName: table.tag.name,
						tagType: table.tag.type
					})
					.from(table.entryTag)
					.innerJoin(table.tag, eq(table.entryTag.tagId, table.tag.id))
					.where(inArray(table.entryTag.entryId, entryIds))
			: [];

	// Group tags by entry
	const tagsByEntry = new Map<string, Array<{ name: string; type: string }>>();
	for (const row of entryTagsData) {
		if (!tagsByEntry.has(row.entryId)) {
			tagsByEntry.set(row.entryId, []);
		}
		tagsByEntry.get(row.entryId)!.push({
			name: row.tagName,
			type: row.tagType
		});
	}

	// Sanitize HTML server-side and attach tags
	const entries = rows.map((row) => ({
		...row,
		html: sanitizeHtml(marked.parse(row.content) as string, {
			allowedTags: sanitizeHtml.defaults.allowedTags.concat(['audio', 'source']),
			allowedAttributes: {
				...sanitizeHtml.defaults.allowedAttributes,
				audio: ['controls', 'src'],
				source: ['src', 'type']
			}
		}),
		tags: tagsByEntry.get(row.id) || []
	}));
	return entries;
});

export const createEntry = form(
	v.object({ content: v.string(), mood: v.string() }),
	async (data) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user?.id) throw new Error('Unauthorized');

		// Basic rate limit: 60 creates per minute per IP
		const ip = event.getClientAddress?.() ?? 'unknown';
		const ok = await allowRate(String(ip), 60, 60_000);
		if (!ok) throw new Error('rate_limited');

		// Analyze sentiment and extract keywords/entities
		const sentiment = await analyzeSentiment(data.content);
		const keywords = extractKeywords(data.content, 5);
		const entities = extractEntities(data.content);

		const id = crypto.randomUUID();
		const now = new Date();

		// Insert entry
		await db.insert(table.entry).values({
			id,
			userId: user.id,
			content: data.content,
			mood: data.mood,
			sentimentLabel: sentiment.label,
			sentimentScore: Math.round(sentiment.normalizedScore * 100), // Store as integer -100 to +100
			createdAt: now,
			updatedAt: now
		});

		// Process and insert tags (keywords + entities)
		const allTags = [
			...keywords.map((k) => ({ name: k, type: 'keyword' })),
			...entities.map((e) => ({ name: e, type: 'entity' }))
		];

		if (allTags.length > 0) {
			// Insert or get existing tags
			const tagIds: string[] = [];

			for (const { name, type } of allTags) {
				// Check if tag exists
				const [existingTag] = await db
					.select()
					.from(table.tag)
					.where(eq(table.tag.name, name))
					.limit(1);

				let tagId: string;
				if (existingTag) {
					tagId = existingTag.id;
				} else {
					// Create new tag
					tagId = crypto.randomUUID();
					await db.insert(table.tag).values({
						id: tagId,
						name,
						type,
						createdAt: now
					});
				}
				tagIds.push(tagId);
			}

			// Link tags to entry
			if (tagIds.length > 0) {
				await db.insert(table.entryTag).values(
					tagIds.map((tagId) => ({
						entryId: id,
						tagId: tagId,
						createdAt: now
					}))
				);
			}
		}

		// Generate AI follow-up question if enabled
		let aiQuestion: string | null = null;
		try {
			const settings = await getAISettings(user.id);
			if (settings?.aiEnabled && settings?.privacyConsent) {
				aiQuestion = await generateFollowUpQuestion(user.id, id, settings);
			}
		} catch (error) {
			console.error('Error generating AI follow-up question:', error);
			// Don't fail the entry creation if AI fails
		}

		// Update achievements
		updateUserAchievements(user.id);

		return { id, aiQuestion };
	}
);
