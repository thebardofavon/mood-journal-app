import type { PageServerLoad } from './$types';
import { validateSessionToken } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { desc, eq, like, and, inArray, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const token = cookies.get('auth-session');
	const { user } = await validateSessionToken(token || '');
	if (!user) throw redirect(303, '/auth/login');

	// Get pagination and filter params
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = 20;
	const offset = (page - 1) * limit;
	const moodFilter = url.searchParams.get('mood') || 'all';
	const searchQuery = url.searchParams.get('q') || '';
	const tagFilter = url.searchParams.get('tag') || '';

	try {
		// Build query conditions
		const conditions = [eq(table.entry.userId, user.id)];

		if (moodFilter !== 'all') {
			conditions.push(eq(table.entry.mood, moodFilter));
		}

		if (searchQuery.trim()) {
			conditions.push(like(table.entry.content, `%${searchQuery}%`));
		}

		// Handle tag filtering
		let tagFilteredEntryIds: string[] = [];
		if (tagFilter.trim()) {
			const tagEntries = await db
				.select({ entryId: table.entryTag.entryId })
				.from(table.entryTag)
				.innerJoin(table.tag, eq(table.entryTag.tagId, table.tag.id))
				.where(eq(table.tag.name, tagFilter.trim()));

			tagFilteredEntryIds = tagEntries.map((te) => te.entryId);
			if (tagFilteredEntryIds.length > 0) {
				conditions.push(inArray(table.entry.id, tagFilteredEntryIds));
			} else {
				// No entries with this tag, return empty
				return {
					user,
					entries: [],
					pagination: {
						page: 1,
						totalPages: 0,
						totalEntries: 0
					},
					filters: {
						mood: moodFilter,
						search: searchQuery,
						tag: tagFilter
					},
					topTags: []
				};
			}
		}

		// Get total count for pagination
		const countResult = await db
			.select()
			.from(table.entry)
			.where(and(...conditions));

		const totalEntries = countResult.length;
		const totalPages = Math.ceil(totalEntries / limit);

		// Get entries with pagination
		const rows = await db
			.select()
			.from(table.entry)
			.where(and(...conditions))
			.orderBy(desc(table.entry.createdAt))
			.limit(limit)
			.offset(offset);

		// Get entry IDs for tag fetching
		const entryIds = rows.map((entry) => entry.id);

		// Fetch tags for entries
		let entryTags: Array<{ entryId: string; tags: Array<{ name: string; type: string }> }> = [];
		if (entryIds.length > 0) {
			const tagData = await db
				.select({
					entryId: table.entryTag.entryId,
					tagName: table.tag.name,
					tagType: table.tag.type,
					tagId: table.tag.id
				})
				.from(table.entryTag)
				.innerJoin(table.tag, eq(table.entryTag.tagId, table.tag.id))
				.where(inArray(table.entryTag.entryId, entryIds));

			// Group tags by entry
			const tagsByEntry = new Map<string, Array<{ name: string; type: string }>>();
			for (const tag of tagData) {
				if (!tagsByEntry.has(tag.entryId)) {
					tagsByEntry.set(tag.entryId, []);
				}
				tagsByEntry.get(tag.entryId)!.push({
					name: tag.tagName,
					type: tag.tagType
				});
			}

			// Convert to array format for entries
			entryTags = Array.from(tagsByEntry.entries()).map(([entryId, tags]) => ({
				entryId,
				tags
			}));
		}

		// Fetch top tags for tag cloud (only if no tag filter is active)
		let topTags: Array<{ name: string; type: string; count: number }> = [];
		if (!tagFilter) {
			const tagCloudData = await db
				.select({
					name: table.tag.name,
					type: table.tag.type,
					count: sql<number>`count(${table.entryTag.entryId})`
				})
				.from(table.entryTag)
				.innerJoin(table.tag, eq(table.entryTag.tagId, table.tag.id))
				.innerJoin(table.entry, eq(table.entryTag.entryId, table.entry.id))
				.where(eq(table.entry.userId, user.id))
				.groupBy(table.tag.id, table.tag.name, table.tag.type)
				.orderBy(desc(sql<number>`count(${table.entryTag.entryId})`))
				.limit(20);

			topTags = tagCloudData;
		}

		// Create excerpts and attach data
		const entries = rows.map((entry) => {
			// Extract first 150 characters as excerpt
			const plainText = entry.content.replace(/[#*`[\]()]/g, '').trim();
			const excerpt = plainText.length > 150 ? plainText.substring(0, 150) + '...' : plainText;

			// Get tags for this entry
			const entryTagData = entryTags.find((et) => et.entryId === entry.id);

			return {
				id: entry.id,
				mood: entry.mood,
				excerpt,
				createdAt: entry.createdAt,
				updatedAt: entry.updatedAt,
				sentimentLabel: entry.sentimentLabel,
				sentimentScore: entry.sentimentScore,
				tags: entryTagData?.tags || []
			};
		});

		return {
			user,
			entries,
			pagination: {
				page,
				totalPages,
				totalEntries
			},
			filters: {
				mood: moodFilter,
				search: searchQuery,
				tag: tagFilter
			},
			topTags
		};
	} catch (dbError) {
		console.error('[journal] Database error loading entries:', dbError);
		return {
			user,
			entries: [],
			pagination: {
				page: 1,
				totalPages: 0,
				totalEntries: 0
			},
			filters: {
				mood: 'all',
				search: '',
				tag: ''
			},
			topTags: []
		};
	}
};
